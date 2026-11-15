"""CSV roster import (ADR-003 M4-3).

GET  /api/roster/template                     the CSV template
POST /api/roster/{institution_id}/preview     check a CSV; nothing is written to students
GET  /api/roster/{institution_id}/imports     recent imports (no student rows)
POST /api/roster/imports/{id}/commit          write the checked rows (one DB transaction)
POST /api/roster/imports/{id}/discard         drop a preview

Import needs: the college switched on by c2c admin (roster_import_enabled, agreement covers
student data) and a verified TPO / group admin / c2c admin (can_manage_college).
Previews hold student data for at most 24 h; commit and discard clear it.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from api.deps import get_current_user, require_admin_supabase
from api.domain import audit
from api.domain.roster import (
    DepartmentResolver, RosterError, check_rows, parse_csv, stored_row, template_csv,
)
from api.domain.tenancy import can_manage_college, institution_access

router = APIRouter(prefix="/roster", tags=["Roster import"])
logger = logging.getLogger("c2c_api.roster")
PREVIEW_TTL = timedelta(hours=24)


def _uid(user) -> str:
    return str(getattr(user, "id", "") or "")


def _college(client, institution_id: int):
    res = (client.table("institutions").select("id, name, status, tenant_id, roster_import_enabled")
           .eq("id", institution_id).execute().data or [])
    if not res:
        raise HTTPException(status_code=404, detail="College not found")
    return res[0]


def _require_import_rights(client, user, institution_id: int):
    inst = _college(client, institution_id)
    if not can_manage_college(client, user, institution_id):
        raise HTTPException(status_code=403, detail="Only the college's verified TPO (or c2c admin) can import a roster.")
    if not inst.get("roster_import_enabled"):
        raise HTTPException(status_code=409, detail="Roster import isn't switched on for this college yet. "
                                                    "c2c enables it once your agreement covers student data.")
    return inst


def _existing_emails(client, emails):
    """lowercased email -> institution_id, for students that already exist (any college)."""
    found = {}
    emails = sorted(set(emails))
    for i in range(0, len(emails), 150):
        chunk = emails[i:i + 150]
        for row in client.table("students").select("email, institution_id").in_("email", chunk).execute().data or []:
            found[(row.get("email") or "").lower()] = row.get("institution_id")
    return found


def _map_discipline(client):
    cache = {}

    def f(raw: str) -> Optional[str]:
        if raw not in cache:
            try:
                cache[raw] = client.rpc("map_discipline", {"raw": raw}).execute().data
            except Exception as e:
                logger.warning("map_discipline failed: %s", e)
                cache[raw] = None
        return cache[raw]
    return f


@router.get("/template", response_class=PlainTextResponse)
def roster_template(user=Depends(get_current_user)):
    return PlainTextResponse(template_csv(), media_type="text/csv",
                             headers={"Content-Disposition": 'attachment; filename="c2c-roster-template.csv"'})


class PreviewBody(BaseModel):
    filename: Optional[str] = Field(None, max_length=200)
    csv_text: str = Field(..., max_length=2_200_000)


@router.post("/{institution_id}/preview", status_code=201)
def preview_roster(institution_id: int, body: PreviewBody,
                   client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    _require_import_rights(client, user, institution_id)
    try:
        _, rows = parse_csv(body.csv_text)
    except RosterError as e:
        raise HTTPException(status_code=400, detail=str(e))

    depts = (client.table("departments").select("id, name, short_code, discipline_code")
             .eq("institution_id", institution_id).execute().data or [])
    aliases = (client.table("department_aliases").select("alias_norm, department_id")
               .eq("institution_id", institution_id).execute().data or [])
    resolver = DepartmentResolver(depts, aliases, _map_discipline(client))
    emails = [(r.get("email") or "").strip().lower() for r in rows if r.get("email")]
    checked, summary = check_rows(rows, institution_id=institution_id, resolver=resolver,
                                  existing=_existing_emails(client, emails))

    now = datetime.now(timezone.utc)
    # Old unfinished previews of this college: drop their student data.
    client.table("roster_imports").update({"status": "discarded", "rows": []}) \
        .eq("institution_id", institution_id).eq("status", "preview") \
        .lt("created_at", (now - PREVIEW_TTL).isoformat()).execute()
    created = client.table("roster_imports").insert({
        "institution_id": institution_id, "status": "preview", "uploaded_by": _uid(user),
        "filename": (body.filename or "")[:200] or None,
        "rows": [stored_row(r) for r in checked], "summary": summary, "created_at": now.isoformat(),
    }).execute().data[0]
    audit.record(client, "roster.preview", actor_id=_uid(user), entity_type="roster_import", entity_id=created["id"],
                 details={"institution_id": institution_id, "summary": summary})  # counts only, no student data
    return {"id": created["id"], "summary": summary, "rows": checked,
            "expires_at": (now + PREVIEW_TTL).isoformat()}


@router.get("/{institution_id}/imports")
def list_imports(institution_id: int, client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    acc = institution_access(client, user, institution_id)
    if not acc or acc["department_ids"] is not None:
        raise HTTPException(status_code=403, detail="You don't have access to this college.")
    return (client.table("roster_imports")
            .select("id, filename, status, summary, result, created_at, committed_at")
            .eq("institution_id", institution_id).order("created_at", desc=True).limit(20).execute().data or [])


def _import_or_404(client, import_id: str):
    res = (client.table("roster_imports").select("id, institution_id, status, created_at, summary")
           .eq("id", import_id).execute().data or [])
    if not res:
        raise HTTPException(status_code=404, detail="Import not found")
    return res[0]


@router.post("/imports/{import_id}/commit")
def commit_import(import_id: str, client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    imp = _import_or_404(client, import_id)
    _require_import_rights(client, user, imp["institution_id"])
    if imp["status"] != "preview":
        raise HTTPException(status_code=409, detail=f"This import is already {imp['status']}.")
    try:
        result = client.rpc("commit_roster_import", {"p_import": import_id, "p_actor": _uid(user)}).execute().data
    except Exception as e:
        msg = str(getattr(e, "message", "") or e)
        if "roster:" in msg:
            raise HTTPException(status_code=409, detail=msg.split("roster: ")[-1][:200])
        logger.error("roster commit failed for %s: %s", import_id, e)
        raise HTTPException(status_code=500, detail="The import could not be saved. Nothing was changed.")
    audit.record(client, "roster.commit", actor_id=_uid(user), entity_type="roster_import", entity_id=import_id,
                 details={"institution_id": imp["institution_id"], "result": result})
    return result


@router.post("/imports/{import_id}/discard")
def discard_import(import_id: str, client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    imp = _import_or_404(client, import_id)
    if not can_manage_college(client, user, imp["institution_id"]):
        raise HTTPException(status_code=403, detail="You can't change this import.")
    if imp["status"] != "preview":
        raise HTTPException(status_code=409, detail=f"This import is already {imp['status']}.")
    client.table("roster_imports").update({"status": "discarded", "rows": []}).eq("id", import_id).execute()
    audit.record(client, "roster.discard", actor_id=_uid(user), entity_type="roster_import", entity_id=import_id,
                 details={"institution_id": imp["institution_id"]})
    return {"id": import_id, "status": "discarded"}
