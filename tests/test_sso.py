"""Partner SSO (R2 + M3): JWKS, launch tokens, tenancy claims, per-tenant opt-in."""
import json
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.core import sso
from api.core.signing import generate_dev_key
from api.deps import get_current_user, require_admin_supabase
from api.domain.consent import NOTICES
from api.routers.sso_router import router

LAUNCH_URL = "https://eklav.example/integrations/c2c/launch"
T1, T2 = "tenant-1", "tenant-2"


class _Q:
    def __init__(self, rows): self.rows, self.f = rows, {}
    def select(self, *a, **k): return self
    def eq(self, c, v): self.f[c] = v; return self
    def order(self, *a, **k): return self
    def limit(self, *a): return self
    def execute(self):
        return SimpleNamespace(data=[r for r in self.rows if all(str(r.get(c)) == str(v) for c, v in self.f.items())])


def fake_db(enabled=True, tenant=T1, consent=True):
    tables = {
        "students": [{"id": "stu-1", "auth_id": "auth-1", "tenant_id": tenant, "institution_id": 7, "department_id": "dep-1"}],
        "departments": [{"id": "dep-1", "discipline_code": "CSE"}],
        "institutions": [{"id": 7, "tenant_id": tenant}],
        "memberships": [
            {"user_id": "tpo-1", "status": "active", "role": "tpo", "tenant_id": tenant, "institution_id": 7, "department_id": None},
            {"user_id": "hod-1", "status": "active", "role": "dept_coordinator", "tenant_id": tenant, "institution_id": 7, "department_id": "dep-1"},
        ],
        "tenant_partner_links": [{"tenant_id": T1, "partner_id": "eklav", "enabled": enabled}],
        "consent_records": [{"student_id": "stu-1", "partner_id": "eklav", "granted": consent,
                             "age_confirmed": True, "notice_version": NOTICES["eklav"]["version"]}],
    }
    return SimpleNamespace(table=lambda n: _Q(tables.get(n, [])))


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


def _client(role="student", uid="auth-1", profile_id="stu-1", db=None):
    app = FastAPI()
    app.include_router(router, prefix="/api")
    user = SimpleNamespace(id=uid, email="a@college.edu", app_metadata={"role": role, "profile_id": profile_id})
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[require_admin_supabase] = lambda: (db or fake_db())
    return TestClient(app)


def _verify(token, jwks, audience="eklav", issuer="https://c2c.test"):
    header = jwt.get_unverified_header(token)
    jwk = next(k for k in jwks["keys"] if k["kid"] == header["kid"])
    pub = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
    return jwt.decode(token, pub, algorithms=["RS256"], audience=audience, issuer=issuer)


def test_student_token_carries_tenancy_scope(env):
    c = _client()
    jwks = c.get("/api/sso/jwks.json").json()
    assert jwks["keys"][0]["kid"] == "c2c-sso-v1" and "d" not in jwks["keys"][0]  # public only

    r = c.post("/api/sso/eklav/launch")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["launch_url"] == LAUNCH_URL and body["method"] == "POST" and body["field"] == "c2c_token"

    claims = _verify(body["token"], jwks)
    assert claims["sub"] == "auth-1"
    assert claims["c2c_role"] == "student" and claims["c2c_scope_role"] == "student"
    assert claims["c2c_tenant_id"] == T1 and claims["c2c_institution_id"] == 7
    assert claims["c2c_department_id"] == "dep-1" and claims["discipline_code"] == "CSE"
    assert claims["exp"] - claims["iat"] == sso.TOKEN_TTL_SECONDS
    assert claims["jti"]


def test_staff_scope_from_most_specific_membership(env):
    c = _client(role="institution", uid="hod-1", profile_id=None)
    claims = _verify(c.post("/api/sso/eklav/launch").json()["token"], c.get("/api/sso/jwks.json").json())
    assert claims["c2c_scope_role"] == "dept_coordinator" and claims["discipline_code"] == "CSE"
    c = _client(role="institution", uid="tpo-1", profile_id="7")
    claims = _verify(c.post("/api/sso/eklav/launch").json()["token"], c.get("/api/sso/jwks.json").json())
    assert claims["c2c_scope_role"] == "tpo" and claims["c2c_department_id"] is None


def test_blocked_when_tenant_has_not_opted_in(env):
    assert _client(db=fake_db(enabled=False)).post("/api/sso/eklav/launch").status_code == 403
    assert _client(db=fake_db(tenant=T2)).post("/api/sso/eklav/launch").status_code == 403  # no link row


def test_student_needs_own_consent(env):
    """R5 / ADR-004: tenant opt-in is not enough; the student must have turned sharing on."""
    r = _client(db=fake_db(consent=False)).post("/api/sso/eklav/launch")
    assert r.status_code == 403 and "Data sharing" in r.json()["detail"]
    # staff launches are not consent-gated (no student data in their token)
    assert _client(role="institution", uid="tpo-1", profile_id="7", db=fake_db(consent=False)).post(
        "/api/sso/eklav/launch").status_code == 200


def test_blocked_when_user_has_no_tenant(env):
    c = _client(role="institution", uid="nobody", profile_id=None)
    assert c.post("/api/sso/eklav/launch").status_code == 403


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
