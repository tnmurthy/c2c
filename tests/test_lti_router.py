import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
import jwt
from api.routers.lti_router import router as lti_router, get_or_generate_key, KID


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(lti_router, prefix="/api")
    return TestClient(app)


def test_lti_jwks_endpoint(client):
    res = client.get("/api/lti/jwks")
    assert res.status_code == 200
    data = res.json()
    assert "keys" in data
    assert len(data["keys"]) >= 1
    key = data["keys"][0]
    assert key["kty"] == "RSA"
    assert key["alg"] == "RS256"
    assert key["kid"] == KID
    assert key["e"] == "AQAB"
    assert "n" in key and len(key["n"]) > 50


def test_lti_config_endpoint(client):
    res = client.get("/api/lti/config")
    assert res.status_code == 200
    data = res.json()
    assert "oidc_initiation_url" in data
    assert "target_link_uri" in data
    assert "public_jwk_url" in data
    assert data["oidc_initiation_url"].endswith("/api/lti/login")
    assert data["target_link_uri"].endswith("/api/lti/launch")
    assert data["public_jwk_url"].endswith("/api/lti/jwks")


def test_lti_login_missing_parameters_fails(client):
    # Missing iss and login_hint
    res = client.get("/api/lti/login")
    assert res.status_code == 400

    res = client.get("/api/lti/login?iss=https://moodle.test")
    assert res.status_code == 400


def test_lti_login_redirects_to_platform(client):
    params = {
        "iss": "https://moodle.mytestbed.tech",
        "login_hint": "user_42",
        "client_id": "c2c_client_1",
        "target_link_uri": "https://c2c.mytestbed.tech/assessment",
    }
    res = client.get("/api/lti/login", params=params, follow_redirects=False)
    assert res.status_code == 302
    location = res.headers["location"]
    assert location.startswith("https://moodle.mytestbed.tech/mod/lti/auth.php?")
    assert "client_id=c2c_client_1" in location
    assert "login_hint=user_42" in location
    assert "response_type=id_token" in location
    assert "state=" in location
    assert "nonce=" in location


def test_lti_launch_missing_token_fails(client):
    res = client.post("/api/lti/launch", data={})
    assert res.status_code == 400


def test_lti_launch_valid_token_redirects(client):
    payload = {
        "sub": "moodle_student_99",
        "name": "Jane Doe",
        "email": "jane@university.edu",
        "https://purl.imsglobal.org/spec/lti/claim/roles": [
            "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
        ],
        "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": "https://c2c.mytestbed.tech/assessment",
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "dep_123",
    }
    # Create unsigned or HS/RS token for test
    token = jwt.encode(payload, "secret", algorithm="HS256")

    res = client.post(
        "/api/lti/launch",
        data={"id_token": token, "state": "test_state"},
        follow_redirects=False,
    )
    assert res.status_code == 303
    location = res.headers["location"]
    assert "/assessment" in location
    assert "lti=1" in location
    assert "email=jane%40university.edu" in location or "email=jane@university.edu" in location
    assert "uid=moodle_student_99" in location


def test_build_ags_score_payload():
    from api.services.lti_ags import build_ags_score_payload
    payload = build_ags_score_payload("u123", 88.5, 100.0, "Great work")
    assert payload["scoreGiven"] == 88.5
    assert payload["scoreMaximum"] == 100.0
    assert payload["activityProgress"] == "Completed"
    assert payload["gradingProgress"] == "FullyGraded"
    assert payload["userId"] == "u123"
    assert payload["comment"] == "Great work"


def test_grade_passback_endpoint(client, monkeypatch):
    # Mock send_lti_grade in lti_router so no real external HTTP call is made
    monkeypatch.setattr(
        "api.routers.lti_router.send_lti_grade",
        lambda lineitem_url, user_id, score, max_score=100.0, comment=None, access_token=None, timeout=8.0: {
            "success": True,
            "status_code": 200,
            "endpoint": f"{lineitem_url}/scores",
        },
    )

    req_body = {
        "lineitem_url": "https://moodle.test/mod/lti/service/ags/lineitem/42",
        "user_id": "std_101",
        "score": 91.2,
        "max_score": 100.0,
        "comment": "Placement Certified",
    }
    res = client.post("/api/lti/grade-passback", json=req_body)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status_code"] == 200


def test_moodle_client_auto_remediate_simulation():
    from api.services.moodle_client import MoodleClient
    client = MoodleClient(token=None)
    assert not client.is_configured()
    res = client.auto_remediate_gaps(
        student_id="std_99",
        student_email="std99@c2c.demo",
        audit_gaps=["Distributed Concurrency", "Incident Triage", "Founder Alignment"],
    )
    assert res["success"] is True
    assert res["simulated"] is True
    assert len(res["enrolled_courses"]) == 3
    titles = [c["title"] for c in res["enrolled_courses"]]
    assert any("Concurrency" in t for t in titles)
    assert any("Incident" in t for t in titles)
    assert any("Founder" in t for t in titles)


def test_auto_enrol_endpoint(client):
    req_body = {
        "student_id": "std_101",
        "student_email": "std101@c2c.demo",
        "audit_gaps": ["FastAPI Concurrency", "JWT Security"],
    }
    res = client.post("/api/lti/auto-enrol", json=req_body)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["enrolled_courses"]) >= 2


