"""Partner API (R4): what eklav reads from c2c. Authenticated with a partner key, not a user login.

GET /api/partners/{partner}/events?after=&limit=     event feed (thin, ids), gap-free, per opted-in tenant
GET /api/partners/{partner}/tenants                  opted-in tenants: colleges, departments, cohorts (no people)
GET /api/partners/{partner}/students?tenant_id=      ids of students currently sharing with this partner
GET /api/partners/{partner}/students/{student_id}    details - only if the tenant opted in AND the student consents

A student who isn't shared looks exactly like one that doesn't exist (404 "not_shared").
Every detail read is written to audit_logs (who read which student, when).
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps import require_admin_supabase
from api.domain import audit
from api.domain.consent import NOTICES, decision_is_valid, has_consent
from api.domain.partner_auth import partner_key_header, verify
from api.domain.tenancy import institution_tenant
from api.integrations.partners import get_partner

router = APIRouter(prefix="/partners/{partner_id}", tags=["Partner API"])
logger = logging.getLogger("c2c_api.partner_api")
NOT_SHARED = HTTPException(status_code=404, detail="not_shared")


def partner_context(partner_id: str, authorization: Optional[str] = Depends(partner_key_header),
                    client=Depends(require_admin_supabase)):
    if not get_partner(partner_id) or partner_id not in NOTICES:
        raise HTTPException(status_code=404, detail="Unknown partner")
    cred = verify(client, partner_id, authorization)
    try:
        client.table("partner_credentials").update({"last_used_at": datetime.now(timezone.utc).isoformat()}) \
            .eq("id", cred["id"]).execute()
    except Exception as e:  # bookkeeping only
        logger.warning("last_used_at update failed: %s", e)
    return {"partner_id": partner_id, "credential_id": cred["id"], "client": client}


def _enabled_tenants(client, partner_id: str) -> list:
    rows = (client.table("tenant_partner_links").select("tenant_id").eq("partner_id", partner_id)
            .eq("enabled", True).execute().data or [])
    return [str(r["tenant_id"]) for r in rows]


@router.get("/events")
def events(after: int = Query(0, ge=0), limit: int = Query(500, ge=1, le=1000), ctx=Depends(partner_context)):
    rows = ctx["client"].rpc("partner_event_feed", {"p_partner": ctx["partner_id"], "p_after": after,
                                                    "p_limit": limit}).execute().data or []
    out = [{k: r.get(k) for k in ("id", "event_id", "type", "schema_version", "occurred_at", "tenant_id",
                                  "subject_id", "payload")} for r in rows]
    return {"events": out, "next_cursor": out[-1]["id"] if out else after}


@router.get("/tenants")
def tenants(ctx=Depends(partner_context)):
    client = ctx["client"]
    ids = _enabled_tenants(client, ctx["partner_id"])
    if not ids:
        return {"tenants": []}
    t_rows = client.table("tenants").select("tenant_id, name, kind").in_("tenant_id", ids).execute().data or []
    insts = (client.table("institutions").select("id, name, status, tenant_id, affiliating_university")
             .in_("tenant_id", ids).execute().data or [])
    inst_ids = [i["id"] for i in insts]
    depts = (client.table("departments").select("id, institution_id, name, short_code, discipline_code")
             .in_("institution_id", inst_ids).execute().data or []) if inst_ids else []
    dept_ids = [d["id"] for d in depts]
    cohorts = (client.table("cohorts").select("id, department_id, program, graduation_year")
               .in_("department_id", dept_ids).execute().data or []) if dept_ids else []
    by_dept = {}
    for c in cohorts:
        by_dept.setdefault(str(c["department_id"]), []).append({k: c.get(k) for k in ("id", "program", "graduation_year")})
    by_inst = {}
    for d in depts:
        by_inst.setdefault(str(d["institution_id"]), []).append(dict(
            {k: d.get(k) for k in ("id", "name", "short_code", "discipline_code")}, cohorts=by_dept.get(str(d["id"]), [])))
    by_tenant = {}
    for i in insts:
        by_tenant.setdefault(str(i["tenant_id"]), []).append(dict(
            {k: i.get(k) for k in ("id", "name", "status", "affiliating_university")},
            departments=by_inst.get(str(i["id"]), [])))
    return {"tenants": [dict({k: t.get(k) for k in ("tenant_id", "name", "kind")},
                         institutions=by_tenant.get(str(t["tenant_id"]), [])) for t in t_rows]}


@router.get("/students")
def shared_students(tenant_id: str = Query(...), ctx=Depends(partner_context)):
    client, pid = ctx["client"], ctx["partner_id"]
    if tenant_id not in _enabled_tenants(client, pid):
        raise HTTPException(status_code=404, detail="Unknown tenant")
    # by college, not students.tenant_id: self-registered students may not carry tenant_id
    inst_ids = [i["id"] for i in (client.table("institutions").select("id").eq("tenant_id", tenant_id)
                                  .execute().data or [])]
    ids = []
    for i in range(0, len(inst_ids), 100):
        ids += [s["id"] for s in (client.table("students").select("id").in_("institution_id", inst_ids[i:i + 100])
                                  .eq("is_synthetic", False).execute().data or [])]
    shared = []
    for i in range(0, len(ids), 150):
        rows = (client.table("student_consents").select("student_id, granted, age_confirmed, notice_version")
                .eq("partner_id", pid).in_("student_id", ids[i:i + 150]).execute().data or [])
        shared += [r["student_id"] for r in rows if decision_is_valid(r, pid)]
    return {"tenant_id": tenant_id, "student_ids": shared}


@router.get("/students/{student_id}")
def student_detail(student_id: str, ctx=Depends(partner_context)):
    client, pid = ctx["client"], ctx["partner_id"]
    rows = (client.table("students").select(
        "id, full_name, email, graduation_year, institution_id, tenant_id, department_id, cohort_id, is_synthetic, auth_id")
        .eq("id", student_id).execute().data or [])
    s = rows[0] if rows else None
    if not s or s.get("is_synthetic"):
        raise NOT_SHARED
    tenant = s.get("tenant_id") or institution_tenant(client, s.get("institution_id"))
    if not tenant or str(tenant) not in _enabled_tenants(client, pid) or not has_consent(client, s["id"], pid):
        raise NOT_SHARED

    dept = None
    if s.get("department_id"):
        d = client.table("departments").select("id, name, discipline_code").eq("id", s["department_id"]).execute().data
        dept = d[0] if d else None
    program = None
    if s.get("cohort_id"):
        c = client.table("cohorts").select("program").eq("id", s["cohort_id"]).execute().data
        program = c[0]["program"] if c else None
    att = (client.table("assessment_attempts")
           .select("id, attempt_number, dimension_scores, primary_profile, created_at")
           .eq("student_id", s["id"]).order("attempt_number", desc=True).limit(1).execute().data or [])
    latest = att[0] if att else None

    audit.record(client, "partner.student_read", actor_id=None, entity_type="student", entity_id=s["id"],
                 tenant_id=tenant, details={"partner_id": pid, "credential_id": ctx["credential_id"]})
    return {
        "student_id": s["id"], "c2c_user_id": s.get("auth_id"), "tenant_id": tenant,
        "full_name": s.get("full_name"), "email": s.get("email"),
        "institution_id": s.get("institution_id"), "department_id": s.get("department_id"),
        "department_name": (dept or {}).get("name"), "discipline_code": (dept or {}).get("discipline_code"),
        "cohort_id": s.get("cohort_id"), "program": program, "graduation_year": s.get("graduation_year"),
        "latest_assessment": None if not latest else {
            "attempt_id": latest["id"], "attempt_number": latest.get("attempt_number"),
            "completed_at": latest.get("created_at"), "primary_profile": latest.get("primary_profile"),
            "scores": {k: (latest.get("dimension_scores") or {}).get(k) for k in ("IQ", "EQ", "SQ", "AQ", "SpQ")},
        },
    }
