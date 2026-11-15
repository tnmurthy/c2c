"""Tenancy administration (ADR-002 T4, ADR-003 M4-1).

GET  /api/tenancy/overview                       admin: tenants, colleges, unverified staff
POST /api/tenancy/institutions/{id}/activate     admin: prospect -> active, with agreement ref
GET  /api/tenancy/institutions/{id}/departments  admin or the college's staff
GET  /api/tenancy/invites?institution_id=        admin (all) or the college's staff
POST /api/tenancy/invites                        create an invite (see domain/invites.can_invite)
POST /api/tenancy/invites/{id}/revoke            whoever could have created it
POST /api/tenancy/invites/lookup                 signed-in: what an invite link is for
POST /api/tenancy/invites/accept                 signed-in, invited email: become verified staff
POST /api/tenancy/memberships/{id}/verify        admin: verify a legacy (unverified) TPO

Every change is written to audit_logs. The invite token is returned once, to the
inviter, inside accept_url; the database stores only its SHA-256.
"""
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.deps import get_current_user, require_admin_supabase, require_role
from api.domain import audit
from api.domain.invites import (
    DEPT_ROLES, InviteError, app_metadata_after_accept, can_invite, check_acceptable, check_college_ready,
    check_email, check_scope_shape, expiry, hash_token, new_token, normalize_email, public_view,
)
from api.domain.tenancy import active_memberships, institution_access
from api.integrations.mailer import send_mail

router = APIRouter(prefix="/tenancy", tags=["Tenancy admin"])
logger = logging.getLogger("c2c_api.tenancy_admin")

ROLE_LABELS = {"tenant_admin": "Group admin", "tpo": "Training & Placement Officer",
               "dept_coordinator": "Department coordinator", "faculty_mentor": "Faculty mentor"}


def _app_url() -> str:
    return (os.environ.get("NEXT_PUBLIC_APP_URL") or "https://c2c.mytestbed.tech").strip().rstrip("/")


def _uid(user) -> str:
    return str(getattr(user, "id", "") or "")


def _role(user) -> Optional[str]:
    return (getattr(user, "app_metadata", {}) or {}).get("role")


def _raise(e: InviteError):
    raise HTTPException(status_code=e.status, detail=str(e))


def _one(client, table: str, column: str, value, cols: str = "*"):
    res = client.table(table).select(cols).eq(column, value).execute()
    return (res.data or [None])[0]


def _official_domains(client, *, tenant_id=None, institution_id=None) -> list:
    if institution_id is not None:
        inst_ids = [institution_id]
    else:
        inst_ids = [r["id"] for r in (client.table("institutions").select("id").eq("tenant_id", str(tenant_id)).execute().data or [])]
    if not inst_ids:
        return []
    domains = [r.get("domain") for r in (client.table("institutions").select("domain").in_("id", inst_ids).execute().data or [])]
    try:
        domains += [r.get("domain") for r in (client.table("institution_domains").select("domain").in_("institution_id", inst_ids).execute().data or [])]
    except Exception as e:
        logger.warning("institution_domains lookup failed: %s", e)
    return [d for d in domains if d]


def _require_whole_college(client, user, institution_id):
    acc = institution_access(client, user, institution_id)
    if not acc or acc["department_ids"] is not None:
        raise HTTPException(status_code=403, detail="You don't have access to this college.")


# ------------------------------------------------------------------ admin overview
@router.get("/overview")
def overview(client=Depends(require_admin_supabase), user=Depends(require_role(["admin"]))):
    tenants = client.table("tenants").select("tenant_id, name, kind, status").order("name").execute().data or []
    insts = (client.table("institutions")
             .select("id, name, domain, status, tenant_id, affiliating_university, agreement_ref, activated_at")
             .order("name").execute().data or [])
    staff = (client.table("memberships")
             .select("id, user_id, tenant_id, institution_id, department_id, role, status, source, invited_email, verified_at")
             .neq("role", "student").eq("status", "active").execute().data or [])
    for m in staff:
        if not m.get("invited_email"):
            try:
                u = client.auth.admin.get_user_by_id(m["user_id"])
                m["email"] = getattr(getattr(u, "user", None), "email", None)
            except Exception:
                m["email"] = None
        else:
            m["email"] = m["invited_email"]
    by_tenant = {}
    for i in insts:
        by_tenant.setdefault(str(i.get("tenant_id")), []).append(i)
    return {
        "tenants": [dict(t, institutions=by_tenant.get(str(t["tenant_id"]), [])) for t in tenants],
        "staff": staff,
    }


class ActivateBody(BaseModel):
    agreement_ref: str = Field(..., min_length=3, max_length=120)


@router.post("/institutions/{institution_id}/activate")
def activate_institution(institution_id: int, body: ActivateBody,
                         client=Depends(require_admin_supabase), user=Depends(require_role(["admin"]))):
    inst = _one(client, "institutions", "id", institution_id, "id, name, status, tenant_id, agreement_ref")
    if not inst:
        raise HTTPException(status_code=404, detail="College not found")
    if not inst.get("tenant_id"):
        raise HTTPException(status_code=409, detail="Assign the college to a tenant before activating it.")
    ref = body.agreement_ref.strip()
    changes = {"status": "active", "agreement_ref": ref}
    if inst.get("status") != "active":
        changes.update(activated_at=datetime.now(timezone.utc).isoformat(), activated_by=_uid(user))
    client.table("institutions").update(changes).eq("id", institution_id).execute()
    audit.record(client, "institution.activate", actor_id=_uid(user), entity_type="institution",
                 tenant_id=inst["tenant_id"],
                 details={"institution_id": institution_id, "from": inst.get("status"), "agreement_ref": ref})
    return {"id": institution_id, "status": "active", "agreement_ref": ref}


@router.get("/institutions/{institution_id}/departments")
def list_departments(institution_id: int, client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    acc = institution_access(client, user, institution_id)
    if not acc:
        raise HTTPException(status_code=403, detail="You don't have access to this college.")
    q = client.table("departments").select("id, name, short_code, discipline_code").eq("institution_id", institution_id)
    rows = q.order("name").execute().data or []
    if acc["department_ids"] is not None:
        rows = [r for r in rows if str(r["id"]) in acc["department_ids"]]
    return rows


# ------------------------------------------------------------------ invites
class InviteBody(BaseModel):
    email: str = Field(..., max_length=254)
    role: str
    tenant_id: Optional[str] = None
    institution_id: Optional[int] = None
    department_id: Optional[str] = None


@router.get("/invites")
def list_invites(institution_id: Optional[int] = Query(None), tenant_id: Optional[str] = Query(None),
                 client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    q = client.table("invites").select("*").order("created_at", desc=True).limit(200)
    if _role(user) != "admin":
        if institution_id is None:
            raise HTTPException(status_code=400, detail="institution_id is required")
        _require_whole_college(client, user, institution_id)
    if institution_id is not None:
        q = q.eq("institution_id", institution_id)
    if tenant_id:
        q = q.eq("tenant_id", tenant_id)
    return [public_view(i) for i in (q.execute().data or [])]


@router.post("/invites", status_code=201)
def create_invite(body: InviteBody, client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    email = normalize_email(body.email)
    try:
        check_scope_shape(body.role, body.institution_id, body.department_id)
    except InviteError as e:
        _raise(e)

    inst = None
    if body.institution_id is not None:
        inst = _one(client, "institutions", "id", body.institution_id, "id, name, status, tenant_id, agreement_ref")
        if not inst:
            raise HTTPException(status_code=404, detail="College not found")
        tenant_id = inst.get("tenant_id")
        if body.tenant_id and str(body.tenant_id) != str(tenant_id):
            raise HTTPException(status_code=400, detail="College is not in that tenant.")
    else:
        tenant_id = body.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required for a group admin invite.")
    if body.department_id is not None:
        dept = _one(client, "departments", "id", body.department_id, "id, institution_id, name")
        if not dept or str(dept.get("institution_id")) != str(body.institution_id):
            raise HTTPException(status_code=400, detail="Department is not in that college.")

    if not can_invite(_role(user), active_memberships(client, _uid(user)), role=body.role,
                      tenant_id=tenant_id, institution_id=body.institution_id):
        raise HTTPException(status_code=403, detail="You can't send this invite.")
    try:
        if inst is not None:
            check_college_ready(inst)
        check_email(email, _official_domains(client, tenant_id=tenant_id, institution_id=body.institution_id))
    except InviteError as e:
        _raise(e)

    # One open invite per person and scope: replace any earlier one.
    now = datetime.now(timezone.utc)
    stale = [o["id"] for o in (client.table("invites").select("id, institution_id, department_id").eq("email", email)
                               .eq("tenant_id", str(tenant_id)).eq("role", body.role)
                               .is_("accepted_at", "null").is_("revoked_at", "null").execute().data or [])
             if str(o.get("institution_id")) == str(body.institution_id)
             and str(o.get("department_id")) == str(body.department_id)]
    if stale:
        client.table("invites").update({"revoked_at": now.isoformat(), "revoked_by": _uid(user)}).in_("id", stale).execute()

    token = new_token()
    row = {
        "token_hash": hash_token(token), "email": email, "tenant_id": str(tenant_id),
        "institution_id": body.institution_id, "department_id": body.department_id, "role": body.role,
        "agreement_ref": (inst or {}).get("agreement_ref"), "invited_by": _uid(user),
        "created_at": now.isoformat(), "expires_at": expiry(now).isoformat(),
    }
    created = client.table("invites").insert(row).execute().data[0]
    accept_url = f"{_app_url()}/invite/{token}"

    where = (inst or {}).get("name") or "your college group"
    emailed = send_mail(
        email, f"You're invited to c2c as {ROLE_LABELS[body.role]}",
        f"Hello,\n\nYou have been invited to join {where} on c2c (Campus to Corporate) as "
        f"{ROLE_LABELS[body.role]}.\n\nAccept within 72 hours, signed in with this email address ({email}):\n"
        f"{accept_url}\n\nIf you weren't expecting this, ignore this email.\n",
    )
    audit.record(client, "invite.create", actor_id=_uid(user), entity_type="invite", entity_id=created["id"],
                 tenant_id=tenant_id,
                 details={"role": body.role, "email_domain": email.split("@")[-1], "institution_id": body.institution_id,
                          "department_id": body.department_id, "replaced": stale, "emailed": emailed})
    return dict(public_view(created), accept_url=accept_url, emailed=emailed)


@router.post("/invites/{invite_id}/revoke")
def revoke_invite(invite_id: str, client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    inv = _one(client, "invites", "id", invite_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invite not found")
    if not can_invite(_role(user), active_memberships(client, _uid(user)), role=inv["role"],
                      tenant_id=inv["tenant_id"], institution_id=inv.get("institution_id")):
        raise HTTPException(status_code=403, detail="You can't revoke this invite.")
    if inv.get("accepted_at") or inv.get("revoked_at"):
        raise HTTPException(status_code=409, detail="This invite is already closed.")
    client.table("invites").update({"revoked_at": datetime.now(timezone.utc).isoformat(), "revoked_by": _uid(user)}) \
        .eq("id", invite_id).execute()
    audit.record(client, "invite.revoke", actor_id=_uid(user), entity_type="invite", entity_id=invite_id,
                 tenant_id=inv["tenant_id"], details={"role": inv["role"]})
    return {"id": invite_id, "state": "revoked"}


class TokenBody(BaseModel):
    token: str = Field(..., min_length=20, max_length=200)


def _invite_by_token(client, token: str):
    return _one(client, "invites", "token_hash", hash_token(token))


@router.post("/invites/lookup")
def lookup_invite(body: TokenBody, client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    inv = _invite_by_token(client, body.token)
    if not inv:
        raise HTTPException(status_code=404, detail="This invite link is not valid.")
    view = public_view(inv)
    inst = _one(client, "institutions", "id", inv["institution_id"], "name") if inv.get("institution_id") else None
    dept = _one(client, "departments", "id", inv["department_id"], "name") if inv.get("department_id") else None
    tenant = _one(client, "tenants", "tenant_id", inv["tenant_id"], "name")
    return {
        "email": inv["email"], "role": inv["role"], "role_label": ROLE_LABELS.get(inv["role"]),
        "state": view["state"], "expires_at": inv["expires_at"],
        "institution": (inst or {}).get("name"), "department": (dept or {}).get("name"),
        "tenant": (tenant or {}).get("name"),
        "email_matches": normalize_email(getattr(user, "email", "")) == inv["email"],
    }


@router.post("/invites/accept")
def accept_invite(body: TokenBody, client=Depends(require_admin_supabase), user=Depends(get_current_user)):
    inv = _invite_by_token(client, body.token)
    try:
        check_acceptable(inv, getattr(user, "email", None))
        new_meta = app_metadata_after_accept(getattr(user, "app_metadata", {}) or {}, inv)
    except InviteError as e:
        _raise(e)

    uid = _uid(user)
    now = datetime.now(timezone.utc).isoformat()
    # Claim the invite first (conditional update), so a link can only ever be used once.
    claimed = (client.table("invites").update({"accepted_at": now, "accepted_by": uid}).eq("id", inv["id"])
               .is_("accepted_at", "null").is_("revoked_at", "null").execute().data or [])
    if not claimed:
        raise HTTPException(status_code=410, detail="This invite has already been used.")

    try:
        q = (client.table("memberships").select("id").eq("user_id", uid).eq("tenant_id", inv["tenant_id"])
             .eq("role", inv["role"]).neq("status", "revoked"))
        q = q.eq("institution_id", inv["institution_id"]) if inv.get("institution_id") is not None else q.is_("institution_id", "null")
        q = q.eq("department_id", inv["department_id"]) if inv.get("department_id") else q.is_("department_id", "null")
        existing = q.execute().data or []
        verified = {"status": "active", "verified_by": inv.get("invited_by"), "verified_at": now, "invited_email": inv["email"]}
        if existing:
            membership_id = existing[0]["id"]
            client.table("memberships").update(verified).eq("id", membership_id).execute()
        else:
            membership_id = client.table("memberships").insert(dict(
                verified, user_id=uid, tenant_id=inv["tenant_id"], institution_id=inv.get("institution_id"),
                department_id=inv.get("department_id"), role=inv["role"], source="invite",
            )).execute().data[0]["id"]
        client.table("invites").update({"membership_id": membership_id}).eq("id", inv["id"]).execute()
    except Exception as e:
        logger.error("invite accept failed, releasing invite %s: %s", inv["id"], e)
        client.table("invites").update({"accepted_at": None, "accepted_by": None}).eq("id", inv["id"]).execute()
        raise HTTPException(status_code=500, detail="Could not accept the invite. Please try again.")

    if new_meta is not None:
        try:
            client.auth.admin.update_user_by_id(uid, attributes={"app_metadata": new_meta})
        except Exception as e:  # membership already grants access; the role only drives routing
            logger.error("app_metadata update failed for %s: %s", uid, e)

    audit.record(client, "invite.accept", actor_id=uid, entity_type="membership", entity_id=membership_id,
                 tenant_id=inv["tenant_id"],
                 details={"invite_id": inv["id"], "role": inv["role"], "institution_id": inv.get("institution_id")})
    return {"membership_id": membership_id, "role": inv["role"], "institution_id": inv.get("institution_id"),
            "refresh_session": new_meta is not None}


# ------------------------------------------------------------------ legacy TPO verification
@router.post("/memberships/{membership_id}/verify")
def verify_membership(membership_id: str, client=Depends(require_admin_supabase), user=Depends(require_role(["admin"]))):
    m = _one(client, "memberships", "id", membership_id, "id, role, tenant_id, institution_id, status, verified_at")
    if not m:
        raise HTTPException(status_code=404, detail="Membership not found")
    if m["role"] == "student":
        raise HTTPException(status_code=400, detail="Student memberships are not verified here.")
    if m["status"] != "active":
        raise HTTPException(status_code=409, detail="Only active memberships can be verified.")
    if m.get("verified_at"):
        return {"id": membership_id, "verified_at": m["verified_at"]}
    now = datetime.now(timezone.utc).isoformat()
    client.table("memberships").update({"verified_by": _uid(user), "verified_at": now}).eq("id", membership_id).execute()
    audit.record(client, "membership.verify", actor_id=_uid(user), entity_type="membership", entity_id=membership_id,
                 tenant_id=m["tenant_id"], details={"role": m["role"], "institution_id": m.get("institution_id")})
    return {"id": membership_id, "verified_at": now}
