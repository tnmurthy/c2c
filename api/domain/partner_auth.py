"""Partner API keys (R4).

Key format:  c2c_<partner>_<prefix>_<secret>
  prefix  10 lowercase alphanumerics, stored in clear to find the row
  secret  43 url-safe chars (256 bits), stored only as sha256

Keys are created by a c2c admin and shown once; c2c never stores or logs the full key.
"""
import hashlib
import hmac
import re
import secrets
import string
from typing import Any, Dict, Optional, Tuple

from fastapi import Header, HTTPException

KEY_RE = re.compile(r"^c2c_([a-z0-9_-]+?)_([a-z0-9]{10})_([A-Za-z0-9_-]{30,64})$")
_ALNUM = string.ascii_lowercase + string.digits


def _sha(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def new_key(partner_id: str) -> Tuple[str, str, str]:
    """-> (full key to show once, prefix, sha256(secret))."""
    prefix = "".join(secrets.choice(_ALNUM) for _ in range(10))
    secret = secrets.token_urlsafe(32)
    return f"c2c_{partner_id}_{prefix}_{secret}", prefix, _sha(secret)


def parse_key(key: str) -> Optional[Tuple[str, str, str]]:
    m = KEY_RE.match((key or "").strip())
    return (m.group(1), m.group(2), m.group(3)) if m else None


def verify(client, partner_id: str, authorization: Optional[str]) -> Dict[str, Any]:
    """The credential row for a valid, unrevoked key of this partner, else 401."""
    unauthorized = HTTPException(status_code=401, detail="Invalid partner key",
                                 headers={"WWW-Authenticate": "Bearer"})
    if not authorization or not authorization.startswith("Bearer "):
        raise unauthorized
    parsed = parse_key(authorization[7:])
    if not parsed or parsed[0] != partner_id:
        raise unauthorized
    _, prefix, secret = parsed
    rows = (client.table("partner_credentials").select("id, partner_id, key_hash, revoked_at")
            .eq("key_prefix", prefix).execute().data or [])
    row = rows[0] if rows else None
    # compare even when no row, so timing doesn't reveal which prefixes exist
    expected = row["key_hash"] if row else "0" * 64
    ok = hmac.compare_digest(_sha(secret), expected)
    if not row or not ok or row.get("revoked_at") or row.get("partner_id") != partner_id:
        raise unauthorized
    return row


def partner_key_header(authorization: Optional[str] = Header(None)) -> Optional[str]:
    return authorization
