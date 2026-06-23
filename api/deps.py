"""
FastAPI dependencies for the C2C API.
"""
import os
import logging
from fastapi import HTTPException, Header, Depends, status

logger = logging.getLogger("c2c_api")

def get_supabase_client():
    """Create and return a Supabase client. Returns None if env vars are missing."""
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "http://127.0.0.1:54331"
        key = os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
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
            detail="Database connection unavailable. Check SUPABASE_URL and SUPABASE_KEY environment variables."
        )
    return client

def require_admin_supabase():
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "http://127.0.0.1:54331"
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
        if not url or not key:
            raise HTTPException(status_code=503, detail="No admin credentials")
        return create_client(url, key)
    except Exception as e:
        logger.error("Failed to create admin client: %s", e)
        raise HTTPException(status_code=503, detail="No admin client")

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
        # Bypassing RLS by not setting the token, using service_role key
        return user_res.user
    except Exception as e:
        logger.error(f"Auth verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

def require_role(allowed_roles: list[str]):
    """FastAPI dependency factory to enforce RBAC constraints."""
    def dependency(user = Depends(get_current_user)):
        metadata = getattr(user, "user_metadata", {}) or {}
        role = metadata.get("role")
        email = getattr(user, "email", "") or ""
        
        # Admin bypass or domain check
        if role == "admin" or email.endswith("@taliatech.in"):
            return user
            
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role must be one of {allowed_roles}"
            )
        return user
    return dependency

