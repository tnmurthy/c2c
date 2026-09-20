import os
import jwt
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from api.schemas.assessment import TokenClaims

bearer = HTTPBearer()


@lru_cache(maxsize=1)
def _jwt_secret() -> str:
    return os.environ["SUPABASE_JWT_SECRET"]


def get_current_claims(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> TokenClaims:
    try:
        payload = jwt.decode(
            creds.credentials,
            _jwt_secret(),
            algorithms=["HS256"],
            audience="authenticated",
            leeway=10,
        )
        meta = payload.get("app_metadata", {})
        role = meta.get("role")
        if not role:
            raise ValueError("Missing role in app_metadata")
        return TokenClaims(
            sub=payload["sub"],
            role=role,
            institution_id=meta.get("institution_id"),
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
