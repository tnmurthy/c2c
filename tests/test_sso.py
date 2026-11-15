"""Partner SSO (R2): JWKS publishing and launch-token issuing."""
import json
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.core import sso
from api.core.signing import generate_dev_key
from api.deps import get_current_user
from api.routers.sso_router import router

LAUNCH_URL = "https://eklav.example/integrations/c2c/launch"


def _pem(key) -> str:
    return key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    ).decode()


@pytest.fixture
def key():
    return generate_dev_key()


@pytest.fixture
def env(monkeypatch, key):
    monkeypatch.setenv("C2C_SSO_PRIVATE_KEY", _pem(key).replace("\n", "\\n"))  # Vercel-style escapes
    monkeypatch.setenv("C2C_ISSUER", "https://c2c.test")
    monkeypatch.setenv("PARTNER_EKLAV_LAUNCH_URL", LAUNCH_URL)
    monkeypatch.delenv("ALLOW_DEMO_AUTH", raising=False)


def _client(role="student", uid="auth-1", profile_id="stu-1"):
    app = FastAPI()
    app.include_router(router, prefix="/api")
    user = SimpleNamespace(id=uid, email="a@college.edu",
                           app_metadata={"role": role, "profile_id": profile_id, "institution_id": "inst-1"})
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def _verify(token, jwks, audience="eklav", issuer="https://c2c.test"):
    header = jwt.get_unverified_header(token)
    jwk = next(k for k in jwks["keys"] if k["kid"] == header["kid"])
    pub = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
    return jwt.decode(token, pub, algorithms=["RS256"], audience=audience, issuer=issuer)


def test_token_verifies_against_published_jwks(env):
    c = _client()
    jwks = c.get("/api/sso/jwks.json").json()
    assert jwks["keys"][0]["kid"] == "c2c-sso-v1" and "d" not in jwks["keys"][0]  # public only

    r = c.post("/api/sso/eklav/launch")
    assert r.status_code == 200
    body = r.json()
    assert body["launch_url"] == LAUNCH_URL and body["method"] == "POST" and body["field"] == "c2c_token"

    claims = _verify(body["token"], jwks)
    assert claims["sub"] == "auth-1"
    assert claims["c2c_role"] == "student"
    assert claims["c2c_profile_id"] == "stu-1"
    assert claims["exp"] - claims["iat"] == sso.TOKEN_TTL_SECONDS
    assert claims["jti"]


def test_wrong_audience_rejected(env):
    c = _client()
    token = c.post("/api/sso/eklav/launch").json()["token"]
    with pytest.raises(jwt.InvalidAudienceError):
        _verify(token, c.get("/api/sso/jwks.json").json(), audience="someone-else")


def test_expired_token_rejected(env, key):
    token = sso.issue_token("eklav", {"sub": "x"}, ttl=1, now=1_000_000)
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(token, key.public_key(), algorithms=["RS256"], audience="eklav")


def test_reserved_claims_cannot_be_overridden(env, key):
    token = sso.issue_token("eklav", {"sub": "x", "aud": "evil", "iss": "evil", "exp": 9999999999})
    claims = jwt.decode(token, key.public_key(), algorithms=["RS256"], audience="eklav")
    assert claims["iss"] == "https://c2c.test" and claims["exp"] - claims["iat"] == sso.TOKEN_TTL_SECONDS


@pytest.mark.parametrize("role", ["institution", "employer"])
def test_tpo_and_employer_can_launch(env, role):
    assert _client(role=role).post("/api/sso/eklav/launch").status_code == 200


@pytest.mark.parametrize("role", ["admin", None, "hacker"])
def test_other_roles_forbidden(env, role):
    assert _client(role=role).post("/api/sso/eklav/launch").status_code == 403


def test_unknown_partner_404(env):
    assert _client().post("/api/sso/nope/launch").status_code == 404


def test_partner_disabled_without_launch_url(env, monkeypatch):
    monkeypatch.delenv("PARTNER_EKLAV_LAUNCH_URL")
    assert _client().post("/api/sso/eklav/launch").status_code == 503


def test_fails_closed_without_key(monkeypatch):
    monkeypatch.delenv("C2C_SSO_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("ALLOW_DEMO_AUTH", raising=False)
    monkeypatch.setenv("PARTNER_EKLAV_LAUNCH_URL", LAUNCH_URL)
    c = _client()
    assert c.get("/api/sso/jwks.json").status_code == 503
    assert c.post("/api/sso/eklav/launch").status_code == 503


def test_dev_key_only_with_demo_auth(monkeypatch):
    monkeypatch.delenv("C2C_SSO_PRIVATE_KEY", raising=False)
    monkeypatch.setenv("ALLOW_DEMO_AUTH", "true")
    assert sso.jwks()["keys"][0]["kty"] == "RSA"
