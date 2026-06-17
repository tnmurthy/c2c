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
            detail="Database connection unavailable. Check SUPABASE_URL and SUPABASE_KEY environment variables."
        )
    return client

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

