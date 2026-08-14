"""
Shared rate limiter for expensive/unauthenticated endpoints (LLM calls,
PDF generation). Keyed by client IP; routers import `limiter` and decorate
individual endpoints rather than rate-limiting the whole API, since most
endpoints are already behind auth and cheap.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
