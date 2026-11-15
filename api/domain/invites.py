"""Staff invites (ADR-002 T4, ADR-003 M4).

Rules, kept free of I/O so they can be unit-tested:
- The token is 256 bits of randomness; only its SHA-256 is stored.
- Single use, 72 h expiry, revocable.
- The invited address must be on one of the college's official domains, never webmail.
- Who may invite whom:
    platform admin          -> anyone, at any scope
    verified tenant_admin   -> tpo / dept_coordinator / faculty_mentor inside its tenant
    verified tpo            -> dept_coordinator / faculty_mentor inside its institution
- Staff invites only for active colleges with an agreement reference on file.
- Accepting requires a signed-in user whose email equals the invited email.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

from api.domain.identity import domain_matches, email_domain, is_public_email_domain

INVITE_TTL = timedelta(hours=72)
INVITE_ROLES = ("tenant_admin", "tpo", "dept_coordinator", "faculty_mentor")
DEPT_ROLES = ("dept_coordinator", "faculty_mentor")


class InviteError(ValueError):
    """A rule was broken; the message is safe to show to the caller."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256((token or "").encode("utf-8")).hexdigest()


def normalize_email(email: Optional[str]) -> str:
    return (email or "").strip().lower()


def expiry(now: Optional[datetime] = None) -> datetime:
    return (now or datetime.now(timezone.utc)) + INVITE_TTL


def check_scope_shape(role: str, institution_id, department_id) -> None:
    if role not in INVITE_ROLES:
        raise InviteError(f"role must be one of {', '.join(INVITE_ROLES)}")
    if role == "tenant_admin" and (institution_id is not None or department_id is not None):
        raise InviteError("A group admin invite covers the whole tenant; leave college and department empty.")
    if role == "tpo" and (institution_id is None or department_id is not None):
        raise InviteError("A TPO invite needs a college and no department.")
    if role in DEPT_ROLES and (institution_id is None or department_id is None):
        raise InviteError("A coordinator or mentor invite needs a college and a department.")


def check_email(email: str, official_domains: Iterable[str]) -> None:
    """The address must be on one of the official domains (subdomains allowed)."""
    dom = email_domain(email)
    if not dom or "@" not in email:
        raise InviteError("Enter a valid email address.")
    if is_public_email_domain(dom):
        raise InviteError("Invites go to an official college address, not a personal mailbox (Gmail, Outlook, ...).")
    domains = [d for d in official_domains if d]
    if not domains:
        raise InviteError("This college has no official email domain on file; add one before inviting staff.")
    if not any(domain_matches(dom, d) for d in domains):
        raise InviteError(f"The address must be on the college's domain ({', '.join(sorted(set(domains)))}).")


def can_invite(app_role: Optional[str], memberships: List[Dict[str, Any]], *, role: str,
               tenant_id, institution_id) -> bool:
    if app_role == "admin":
        return True
    for m in memberships:
        if not m.get("verified_at"):
            continue  # unverified staff cannot vouch for anyone
        if m.get("role") == "tenant_admin" and str(m.get("tenant_id")) == str(tenant_id) \
                and role in ("tpo",) + DEPT_ROLES:
            return True
        if m.get("role") == "tpo" and institution_id is not None \
                and str(m.get("institution_id")) == str(institution_id) and role in DEPT_ROLES:
            return True
    return False


def check_college_ready(institution: Dict[str, Any]) -> None:
    if (institution or {}).get("status") != "active":
        raise InviteError("Activate the college (with its agreement reference) before inviting staff.", status=409)
    if not (institution or {}).get("agreement_ref"):
        raise InviteError("Record the college's agreement reference before inviting staff.", status=409)


def _parse(ts) -> Optional[datetime]:
    if ts is None or isinstance(ts, datetime):
        return ts
    return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))


def invite_state(invite: Dict[str, Any], now: Optional[datetime] = None) -> str:
    """open | accepted | revoked | expired"""
    if invite.get("accepted_at"):
        return "accepted"
    if invite.get("revoked_at"):
        return "revoked"
    exp = _parse(invite.get("expires_at"))
    if exp is None or exp <= (now or datetime.now(timezone.utc)):
        return "expired"
    return "open"


def check_acceptable(invite: Optional[Dict[str, Any]], user_email: Optional[str],
                     now: Optional[datetime] = None) -> None:
    if not invite:
        raise InviteError("This invite link is not valid.", status=404)
    state = invite_state(invite, now)
    if state != "open":
        raise InviteError(f"This invite has been {state}. Ask for a new one.", status=410)
    if normalize_email(user_email) != normalize_email(invite.get("email")):
        raise InviteError("Sign in with the email address the invite was sent to.", status=403)


def app_metadata_after_accept(current: Dict[str, Any], invite: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """New app_metadata for the accepting user, or None to leave it unchanged.

    Raises for student/employer accounts: a staff role on a student login would
    mix two identities (use a separate staff account).
    """
    role = (current or {}).get("role")
    if role == "admin":
        return None
    if role in ("student", "employer"):
        raise InviteError("This account is a student or employer account. Sign in with your staff email account.", status=409)
    new = dict(current or {})
    new["role"] = "institution"
    if invite.get("institution_id") is not None and not new.get("profile_id"):
        new["profile_id"] = invite["institution_id"]
    return None if new == (current or {}) else new


def public_view(invite: Dict[str, Any], now: Optional[datetime] = None) -> Dict[str, Any]:
    """What a list or the inviter sees: never the token hash."""
    return {
        "id": invite.get("id"),
        "email": invite.get("email"),
        "role": invite.get("role"),
        "tenant_id": invite.get("tenant_id"),
        "institution_id": invite.get("institution_id"),
        "department_id": invite.get("department_id"),
        "created_at": invite.get("created_at"),
        "expires_at": invite.get("expires_at"),
        "accepted_at": invite.get("accepted_at"),
        "revoked_at": invite.get("revoked_at"),
        "state": invite_state(invite, now),
    }
