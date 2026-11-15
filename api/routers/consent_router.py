"""Student data-sharing consent (R5, ADR-004).

GET  /api/consent/me              the student's partners (offered by their college), notices and decisions
POST /api/consent/{partner_id}    grant (with notice version + 18+ confirmation) or withdraw

Only the student can decide for themself. Withdrawal is always allowed, even if the college
has since turned the partner off.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.deps import get_current_user, require_admin_supabase, require_role
from api.domain import audit
from api.domain.consent import (
    NOTICES, ConsentError, check_grant, decision_is_valid, latest_decision, notice,
)
from api.domain.tenancy import institution_tenant, partner_enabled

router = APIRouter(prefix="/consent", tags=["Consent"])
logger = logging.getLogger("c2c_api.consent")


def _my_student(client, user):
    rows = (client.table("students").select("id, tenant_id, institution_id, is_synthetic")
            .eq("auth_id", str(getattr(user, "id", ""))).execute().data or [])
    if not rows:
        raise HTTPException(status_code=404, detail="Finish your student profile first.")
    s = rows[0]
    s["tenant_id"] = s.get("tenant_id") or institution_tenant(client, s.get("institution_id"))
    return s


@router.get("/me")
def my_consents(client=Depends(require_admin_supabase), user=Depends(require_role(["student"]))):
    s = _my_student(client, user)
    out = []
    for pid in NOTICES:
        enabled = partner_enabled(client, s["tenant_id"], pid)
        d = latest_decision(client, s["id"], pid)
        if not enabled and not d:
            continue  # not offered by this college and never decided: don't show
        out.append({
            "partner_id": pid,
            "offered": enabled,
            "notice": notice(pid),
            "decision": d,
            "sharing": enabled and decision_is_valid(d, pid),
            "needs_review": bool(d and d.get("granted") and not decision_is_valid(d, pid)),
        })
    return {"student_id": s["id"], "partners": out}


class DecisionBody(BaseModel):
    granted: bool
    notice_version: Optional[str] = Field(None, max_length=40)
    age_confirmed: bool = False


@router.post("/{partner_id}")
def decide(partner_id: str, body: DecisionBody,
           client=Depends(require_admin_supabase), user=Depends(require_role(["student"]))):
    if (getattr(user, "app_metadata", {}) or {}).get("role") != "student":
        raise HTTPException(status_code=403, detail="Only the student can decide this.")
    if partner_id not in NOTICES:
        raise HTTPException(status_code=404, detail="Unknown partner.")
    s = _my_student(client, user)
    if body.granted:
        try:
            check_grant(partner_id, notice_version=body.notice_version, age_confirmed=body.age_confirmed,
                        partner_enabled=partner_enabled(client, s["tenant_id"], partner_id))
        except ConsentError as e:
            raise HTTPException(status_code=e.status, detail=str(e))
    version = body.notice_version or NOTICES[partner_id]["version"]
    client.table("consent_records").insert({
        "student_id": s["id"], "partner_id": partner_id, "granted": body.granted,
        "notice_version": version, "age_confirmed": bool(body.age_confirmed and body.granted),
        "actor": str(user.id),
    }).execute()
    audit.record(client, "consent.grant" if body.granted else "consent.withdraw", actor_id=user.id,
                 entity_type="student", entity_id=s["id"], tenant_id=s["tenant_id"],
                 details={"partner_id": partner_id, "notice_version": version})
    return {"partner_id": partner_id, "sharing": body.granted, "notice_version": version}
