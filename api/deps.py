"""
FastAPI dependencies for the C2C API.
"""
import os
import logging
from fastapi import HTTPException, Header, Depends, status

from api.exceptions import PermissionDeniedError

logger = logging.getLogger("c2c_api")

def get_supabase_client():
    """Create and return a Supabase client. Returns None if env vars are missing."""
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        if not url or not key:
            return None
        return create_client(url, key)
    except Exception as e:
        logger.error("Failed to create Supabase client: %s", e)
        return None

def require_supabase():
    """FastAPI dependency that provides a Supabase client or raises 503."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Database connection unavailable. SUPABASE_URL and SUPABASE_KEY environment variables must be configured."
        )
    return client

def require_admin_supabase():
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise HTTPException(status_code=503, detail="SUPABASE_SERVICE_ROLE_KEY environment variable is not configured.")
        return create_client(url, key)
    except Exception as e:
        logger.error("Failed to create admin client: %s", e)
        raise HTTPException(status_code=503, detail=f"Failed to initialize admin database client: {str(e)}")

async def get_current_user(authorization: str = Header(None), client = Depends(require_supabase)):
    """FastAPI dependency to extract and verify JWT from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token"
        )
    token = authorization.split(" ")[1]
    try:
        user_res = client.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization token"
            )
        return user_res.user
    except Exception as e:
        logger.error(f"Auth verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

async def get_optional_user(authorization: str = Header(None), client = Depends(require_supabase)):
    """
    Like get_current_user, but returns None instead of raising when no token
    is supplied at all. A token that IS supplied must still be valid -- this
    is for endpoints with a legitimate anonymous path, not a blanket auth
    bypass.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        user_res = client.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization token")
        return user_res.user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")

def assert_own_student_profile(user, student_id: str) -> None:
    """
    Raises PermissionDeniedError if a 'student'-role caller is acting on a
    student_id that isn't their own. Admins (and any other allowed role
    passed to require_role) pass through unchecked -- this only constrains
    the student role, matching the pattern already used in
    api/routers/student/applications.py.
    """
    app_metadata = getattr(user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role == "student" and str(app_metadata.get("profile_id")) != str(student_id):
        raise PermissionDeniedError("Access denied: can only act on your own profile")

def assert_own_institution_profile(user, institution_id: str) -> None:
    """
    Raises PermissionDeniedError if an 'institution'-role caller is acting on
    an institution_id that isn't their own. Admins pass through unchecked.
    """
    app_metadata = getattr(user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role == "institution" and str(app_metadata.get("profile_id")) != str(institution_id):
        raise PermissionDeniedError("Access denied: can only act on your own institution")

def get_tenant_id_from_user(user, supabase) -> str | None:
    """
    Extracts the tenant_id from the user's app_metadata, or falls back to a
    crm_users lookup by auth user id. Shared by every CRM-scoped router so
    tenant derivation stays consistent.
    """
    tenant_id = None
    if isinstance(user, dict):
        tenant_id = user.get("tenant_id")
        if not tenant_id:
            metadata = user.get("app_metadata", {}) or {}
            tenant_id = metadata.get("tenant_id")
    else:
        metadata = getattr(user, "app_metadata", {}) or {}
        tenant_id = metadata.get("tenant_id") or getattr(user, "tenant_id", None)

    if not tenant_id:
        user_id = getattr(user, "id", None) or (user.get("id") if isinstance(user, dict) else None) or (user.get("sub") if isinstance(user, dict) else None)
        if user_id:
            try:
                crm_user_res = supabase.table("crm_users").select("tenant_id").eq("user_id", user_id).execute()
                if crm_user_res.data:
                    tenant_id = crm_user_res.data[0].get("tenant_id")
            except Exception as e:
                logger.error(f"Failed to fetch user tenant from database: {e}")

    return tenant_id

def require_role(allowed_roles: list[str]):
    """FastAPI dependency factory to enforce RBAC constraints using app_metadata."""
    def dependency(user = Depends(get_current_user)):
        app_metadata = getattr(user, "app_metadata", {}) or {}
        role = app_metadata.get("role")
        
        # Admin bypass
        if role == "admin":
            return user
            
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role must be one of {allowed_roles}"
            )
        return user
    return dependency

