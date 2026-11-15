"""Domain layer: business rules with no FastAPI dependency.

Routers (api/routers/*) handle HTTP concerns and delegate here. The partner
API for downstream apps (eklav) will read through this layer too, so access
checks and scoring live in one place.
"""
