"""
FastAPI dependencies for the C2C API.
"""
import os
import logging
from fastapi import HTTPException

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
