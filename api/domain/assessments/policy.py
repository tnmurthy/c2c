"""Assessment policy: tenant resolution and retake cooldown.
Moved from api/routers/assessment_router.py (R1) — was duplicated in
start_session and submit_assessment.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from api.exceptions import NotFoundError
from api.domain.tenancy import institution_tenant

DEFAULT_RETAKE_COOLDOWN_DAYS = 90


def resolve_tenant_id(client, student_id: str) -> str:
    """The student's tenant, else their institution's tenant. Raises NotFoundError.

    No "first tenant in the table" fallback (ADR-003 M3): it attached students to
    whichever tenant happened to come first - in production an E2E test tenant.
    """
    student_res = client.table("students").select("tenant_id, institution_id").eq("id", str(student_id)).execute()
    if not student_res.data:
        raise NotFoundError("Student not found")
    row = student_res.data[0]
    tenant_id = row.get("tenant_id") or institution_tenant(client, row.get("institution_id"))
    if tenant_id:
        return tenant_id
    raise NotFoundError("Student is not linked to an institution yet. Ask your placement office to add you.")


def retake_cooldown_until(client, student_id: str, tenant_id: str, now: Optional[datetime] = None) -> Optional[str]:
    """ISO date when a retake becomes allowed, or None if allowed now."""
    last_assess_res = (
        client.table("assessments").select("created_at")
        .eq("student_id", str(student_id)).order("created_at", desc=True).limit(1).execute()
    )
    if not last_assess_res.data:
        return None
    tenant_res = client.table("tenants").select("retake_cooldown_days").eq("tenant_id", str(tenant_id)).execute()
    cooldown_days = DEFAULT_RETAKE_COOLDOWN_DAYS
    if tenant_res.data:
        cooldown_days = tenant_res.data[0].get("retake_cooldown_days", DEFAULT_RETAKE_COOLDOWN_DAYS)

    last_date_str = last_assess_res.data[0]["created_at"]
    if last_date_str.endswith('Z'):
        last_date_str = last_date_str[:-1] + '+00:00'
    last_date = datetime.fromisoformat(last_date_str)
    cooldown_until = last_date + timedelta(days=cooldown_days)
    if (now or datetime.now(timezone.utc)) < cooldown_until:
        return cooldown_until.date().isoformat()
    return None


def cooldown_response_body(cooldown_until: str) -> dict:
    return {
        "detail": f"Assessment cooldown active. Retake available on {cooldown_until}",
        "cooldown_until": cooldown_until,
    }
