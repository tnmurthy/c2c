"""Partner SSO endpoints (eklav). c2c is the identity provider.

GET  /api/sso/jwks.json            public keys partners use to verify tokens
POST /api/sso/{partner_id}/launch  signed-in user gets a 120s launch token

ADR-003 M3: tokens carry the user's tenancy scope, and a launch is allowed only
when the user's tenant has opted in to the partner (tenant_partner_links).
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from api.core import sso
from api.deps import get_current_user, require_admin_supabase
from api.domain.tenancy import partner_enabled, user_scope
from api.integrations.partners import get_partner

router = APIRouter(prefix="/sso", tags=["Partner SSO"])
logger = logging.getLogger("c2c_api.sso")


@router.get("/jwks.json")
def sso_jwks():
    try:
        return sso.jwks()
    except sso.SSONotConfigured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SSO signing key not configured")


@router.post("/{partner_id}/launch")
def launch_partner(partner_id: str, current_user=Depends(get_current_user), client=Depends(require_admin_supabase)):
    partner = get_partner(partner_id)
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown partner")
    if not partner.launch_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"{partner.name} integration is not enabled")

    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role not in partner.launch_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role cannot launch {partner.name}")

    scope = user_scope(client, current_user)
    if not partner_enabled(client, scope["tenant_id"], partner.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"{partner.name} is not enabled for your institution")

    # TODO(R5): also require the student's own data-sharing consent.
    claims = {
        "sub": str(current_user.id),                 # stable c2c auth user id
        "c2c_role": role,
        "c2c_scope_role": scope["scope_role"],       # student | tpo | dept_coordinator | ...
        "c2c_profile_id": app_metadata.get("profile_id"),
        "c2c_tenant_id": str(scope["tenant_id"]),
        "c2c_institution_id": scope["institution_id"],
        "c2c_department_id": str(scope["department_id"]) if scope["department_id"] else None,
        "discipline_code": scope["discipline_code"],
        "email": getattr(current_user, "email", None),
    }
    try:
        token = sso.issue_token(partner.audience, claims)
    except sso.SSONotConfigured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SSO signing key not configured")

    logger.info("SSO launch issued partner=%s role=%s tenant=%s sub=%s", partner.id, role, claims["c2c_tenant_id"], claims["sub"])
    # Token goes in a form POST body, never a URL query string (URLs get logged).
    return {
        "launch_url": partner.launch_url,
        "method": "POST",
        "field": "c2c_token",
        "token": token,
        "expires_in": sso.TOKEN_TTL_SECONDS,
    }
