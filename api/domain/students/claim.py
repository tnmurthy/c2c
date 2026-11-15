"""A student signing up claims the record their college imported (M4-3).

Matching is on the signed-in account's own email (never an email typed in a form),
and only once Supabase has confirmed that email. A record already linked to another
login is never taken over.
"""
from typing import Any, Dict, List, Optional

CLAIM_FILL_FIELDS = ("bio", "linkedin_url", "skills", "resume_url", "phone")


class ClaimError(ValueError):
    def __init__(self, message: str, status: int):
        super().__init__(message)
        self.status = status


def claim_roster_record(client, current_user, auth_id, payload: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
    """Linked record(s), or None when no imported record has this email (normal sign-up)."""
    email = (getattr(current_user, "email", "") or "").strip().lower()
    if not email:
        return None
    rows = (client.table("students").select("id, auth_id, institution_id, email, phone")
            .eq("email", email).execute().data or [])
    if not rows:
        return None
    row = rows[0]
    if row.get("auth_id"):
        if str(row["auth_id"]) == str(auth_id):
            return [row]  # already linked: signing up again is harmless
        raise ClaimError("This email is already linked to another account. Contact your TPO.", 409)
    if not getattr(current_user, "email_confirmed_at", None):
        raise ClaimError("Confirm your email address (check your inbox), then try again.", 403)

    updates: Dict[str, Any] = {"auth_id": str(auth_id)}
    for k in CLAIM_FILL_FIELDS:  # the college's name/department/year stay authoritative
        v = payload.get(k)
        if v in (None, "", []):
            continue
        if k == "phone" and row.get("phone"):
            continue
        updates[k] = v
    res = (client.table("students").update(updates).eq("id", row["id"]).is_("auth_id", "null")
           .execute().data or [])
    if not res:
        raise ClaimError("This record was just linked to another sign-in. Contact your TPO.", 409)
    return res
