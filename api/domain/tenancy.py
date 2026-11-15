"""Tenancy rules (ADR-003, M3): who covers which students, and a student's scope.

Memberships grant staff a role at a scope:
  tenant_admin -> every student in the tenant (all campuses)
  tpo          -> every student in the institution
  dept_coordinator / faculty_mentor -> every student in the department
Email domains never grant access (GO_LIVE B9).

Fails closed: if the memberships table is unavailable (schema not yet migrated),
no membership-based access is granted.
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("c2c_api.tenancy")

STAFF_ROLES = ("tenant_admin", "tpo", "dept_coordinator", "faculty_mentor")


def active_memberships(client, user_id: Optional[str]) -> List[Dict[str, Any]]:
    if not user_id:
        return []
    try:
        res = (
            client.table("memberships")
            .select("tenant_id, institution_id, department_id, role, verified_at")
            .eq("user_id", str(user_id))
            .eq("status", "active")
            .execute()
        )
        return res.data or []
    except Exception as e:  # table missing before M1 is applied, or DB error
        logger.warning(f"memberships lookup failed for {user_id}: {e}")
        return []


def student_scope(client, student_id: str) -> Optional[Dict[str, Any]]:
    """The student's id, login and tenancy scope, or None if no such student."""
    res = client.table("students").select("*").eq("id", str(student_id)).execute()
    if not res.data:
        return None
    s = res.data[0]
    return {
        "id": s.get("id"),
        "auth_id": s.get("auth_id"),
        "tenant_id": s.get("tenant_id"),
        "institution_id": s.get("institution_id"),
        "department_id": s.get("department_id"),
    }


def _same(a, b) -> bool:
    return a is not None and b is not None and str(a) == str(b)


def membership_covers(m: Dict[str, Any], student: Dict[str, Any]) -> bool:
    role = m.get("role")
    if role == "tenant_admin":
        return _same(m.get("tenant_id"), student.get("tenant_id"))
    if role == "tpo":
        return _same(m.get("institution_id"), student.get("institution_id"))
    if role in ("dept_coordinator", "faculty_mentor"):
        return _same(m.get("department_id"), student.get("department_id"))
    return False  # 'student' memberships never grant access to other students


def staff_can_read(memberships: List[Dict[str, Any]], student: Dict[str, Any]) -> bool:
    return any(m.get("role") in STAFF_ROLES and membership_covers(m, student) for m in memberships)


def institution_tenant(client, institution_id) -> Optional[str]:
    if institution_id is None:
        return None
    try:
        res = client.table("institutions").select("tenant_id").eq("id", institution_id).execute()
        return (res.data or [{}])[0].get("tenant_id")
    except Exception as e:  # tenant_id column missing before M1
        logger.warning(f"institution tenant lookup failed for {institution_id}: {e}")
        return None


def partner_enabled(client, tenant_id: Optional[str], partner_id: str) -> bool:
    """True only when the tenant has opted in to this partner (tenant_partner_links)."""
    if not tenant_id:
        return False
    try:
        res = (
            client.table("tenant_partner_links")
            .select("enabled")
            .eq("tenant_id", str(tenant_id))
            .eq("partner_id", partner_id)
            .execute()
        )
        return bool(res.data) and bool(res.data[0].get("enabled"))
    except Exception as e:
        logger.warning(f"partner link lookup failed for tenant {tenant_id}: {e}")
        return False


def user_scope(client, current_user) -> Dict[str, Any]:
    """Tenancy claims for a signed-in user (used by partner SSO).

    Students: from their student record (+ department discipline).
    Staff: from their most specific active membership.
    """
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    scope: Dict[str, Any] = {"tenant_id": None, "institution_id": None, "department_id": None,
                             "discipline_code": None, "scope_role": None}
    if role == "student":
        res = client.table("students").select("*").eq("auth_id", str(current_user.id)).execute()
        if res.data:
            s = res.data[0]
            scope.update(tenant_id=s.get("tenant_id") or institution_tenant(client, s.get("institution_id")),
                         institution_id=s.get("institution_id"), department_id=s.get("department_id"),
                         scope_role="student")
    else:
        ms = [m for m in active_memberships(client, current_user.id) if m.get("role") in STAFF_ROLES]
        if ms:
            rank = {"dept_coordinator": 0, "faculty_mentor": 0, "tpo": 1, "tenant_admin": 2}
            m = sorted(ms, key=lambda x: rank.get(x.get("role"), 9))[0]
            scope.update(tenant_id=m.get("tenant_id"), institution_id=m.get("institution_id"),
                         department_id=m.get("department_id"), scope_role=m.get("role"))
    if scope["department_id"]:
        try:
            d = client.table("departments").select("discipline_code").eq("id", str(scope["department_id"])).execute()
            scope["discipline_code"] = (d.data or [{}])[0].get("discipline_code")
        except Exception as e:
            logger.warning(f"department lookup failed: {e}")
    return scope
