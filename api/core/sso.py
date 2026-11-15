"""Partner SSO: c2c (upstream identity provider) issues short-lived RS256 JWTs
that downstream partners (eklav) verify against c2c's published JWKS.

Config (env):
  C2C_SSO_PRIVATE_KEY  PEM RSA key (>= 2048 bit). Required in production.
                       Generate: openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048
  C2C_SSO_KID          key id published in JWKS (default c2c-sso-v1). Bump on rotation.
  C2C_ISSUER           token `iss` (default NEXT_PUBLIC_APP_URL or https://c2c.mytestbed.tech)

Fails closed: without a configured key, no token is issued and no JWKS is
published — unless ALLOW_DEMO_AUTH=true (local dev), which uses a per-process
key. A per-process key must never be used on Vercel: each serverless instance
would sign with a different key.
"""
import os
import time
import uuid
from typing import Any, Dict, Optional

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from api.core.signing import generate_dev_key, load_pem_private_key, public_jwk

DEFAULT_KID = "c2c-sso-v1"
DEFAULT_ISSUER = "https://c2c.mytestbed.tech"
TOKEN_TTL_SECONDS = 120

_DEV_KEY: Optional[rsa.RSAPrivateKey] = None


class SSONotConfigured(RuntimeError):
    pass


def _demo_allowed() -> bool:
    return os.environ.get("ALLOW_DEMO_AUTH", "").strip().lower() == "true"


def kid() -> str:
    return os.environ.get("C2C_SSO_KID", DEFAULT_KID)


def issuer() -> str:
    return (os.environ.get("C2C_ISSUER") or os.environ.get("NEXT_PUBLIC_APP_URL") or DEFAULT_ISSUER).rstrip("/")


def signing_key() -> rsa.RSAPrivateKey:
    global _DEV_KEY
    pem = os.environ.get("C2C_SSO_PRIVATE_KEY")
    if pem:
        return load_pem_private_key(pem)
    if _demo_allowed():
        if _DEV_KEY is None:
            _DEV_KEY = generate_dev_key()
        return _DEV_KEY
    raise SSONotConfigured("C2C_SSO_PRIVATE_KEY is not configured")


def jwks() -> Dict[str, Any]:
    return {"keys": [public_jwk(signing_key(), kid())]}


def issue_token(audience: str, claims: Dict[str, Any], ttl: int = TOKEN_TTL_SECONDS, now: Optional[int] = None) -> str:
    """Sign a one-shot launch token for `audience`. Reserved claims cannot be overridden."""
    now = int(now if now is not None else time.time())
    payload = dict(claims)
    payload.update({
        "iss": issuer(),
        "aud": audience,
        "iat": now,
        "nbf": now,
        "exp": now + ttl,
        "jti": str(uuid.uuid4()),
    })
    return jwt.encode(payload, signing_key(), algorithm="RS256", headers={"kid": kid()})
