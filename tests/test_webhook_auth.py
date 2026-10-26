"""Every /webhook/* endpoint starts background work, so all require the shared secret."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routers import assessment_router, employer_router, student_router

WEBHOOKS = [
    ("/api/webhook/assessment-completed", assessment_router, "run_agent_recruiters", {"record": {"id": 1, "student_id": "s1"}}),
    ("/api/webhook/student-onboarded", student_router, "run_optimizers", {"record": {"id": "s1"}}),
    ("/api/webhook/job-posted", employer_router, "run_scoring_engine", {"record": {"id": "job1"}}),
    ("/api/webhook/lead-approved", employer_router, "run_auto_apply", {"record": {"id": 1, "url": "https://x"}}),
    ("/api/webhook/daily-sweep", employer_router, "run_market_scout", {}),
]


@pytest.fixture
def client():
    app = FastAPI()
    for r in (assessment_router.router, employer_router.router, student_router.router):
        app.include_router(r, prefix="/api")
    return TestClient(app)


@pytest.fixture
def started(monkeypatch):
    """Replaces every background worker with a recorder, so no real work runs."""
    calls = []
    for _path, module, worker, _body in WEBHOOKS:
        monkeypatch.setattr(module, worker, lambda *a, _w=worker, **k: calls.append(_w))
    return calls


@pytest.mark.parametrize("path, module, worker, body", WEBHOOKS)
def test_refused_when_secret_not_configured(client, started, monkeypatch, path, module, worker, body):
    monkeypatch.delenv("SUPABASE_WEBHOOK_SECRET", raising=False)

    assert client.post(path, json=body, headers={"x-webhook-secret": "anything"}).status_code == 503
    assert started == []


@pytest.mark.parametrize("path, module, worker, body", WEBHOOKS)
def test_refused_with_missing_or_wrong_secret(client, started, monkeypatch, path, module, worker, body):
    monkeypatch.setenv("SUPABASE_WEBHOOK_SECRET", "s3cret")

    assert client.post(path, json=body).status_code == 401
    assert client.post(path, json=body, headers={"x-webhook-secret": "nope"}).status_code == 401
    assert started == []


@pytest.mark.parametrize("path, module, worker, body", WEBHOOKS)
def test_accepted_with_secret(client, started, monkeypatch, path, module, worker, body):
    monkeypatch.setenv("SUPABASE_WEBHOOK_SECRET", "s3cret")

    res = client.post(path, json=body, headers={"x-webhook-secret": "s3cret"})

    assert res.status_code == 200
    assert started == [worker]
