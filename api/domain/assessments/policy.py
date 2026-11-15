"""Assessment policy: tenant resolution and retake cooldown.
Moved from api/routers/assessment_router.py (R1) — was duplicated in
start_session and submit_assessment.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from api.exceptions import NotFoundError

DEFAULT_RETAKE_COOLDOWN_DAYS = 90


def resolve_tenant_id(client, student_id: str) -> str:
    """Student's tenant, else the first tenant. Raises NotFoundError."""
    student_res = client.table("students").select("tenant_id").eq("id", str(student_id)).execute()
    if not student_res.data:
        raise NotFoundError("Student not found")
    tenant_id = student_res.data[0].get("tenant_id")
    if tenant_id:
        return tenant_id
    tenants_res = client.table("tenants").select("tenant_id").limit(1).execute()
    if tenants_res.data:
        return tenants_res.data[0]["tenant_id"]
    raise NotFoundError("No tenants available in the system")


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
