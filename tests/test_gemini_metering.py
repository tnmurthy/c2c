"""
AGENTS.md T5: every billable Gemini request is claimed against the daily cap
first, and nothing is sent when the budget refuses or is not configured.
"""
import importlib.util
import os

import pytest
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIENT_PATH = os.path.join(ROOT, "services", "market-scout", "ai", "client.py")


def _load_client():
    spec = importlib.util.spec_from_file_location("gemini_client_under_test", CLIENT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class _Resp:
    def __init__(self, status, body=None):
        self.status_code = status
        self.text = "err"
        self._body = body or {}
        self.content = b"x"

    def json(self):
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(str(self.status_code))


def _gemini_ok():
    return _Resp(200, {"candidates": [{"content": {"parts": [{"text": '{"analyses": [{"score": 80}]}'}]}}]})


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "g-key")
    return _load_client()


@pytest.fixture
def gemini_posts(monkeypatch):
    """Records Gemini HTTP calls; replies come from the `replies` list."""
    box = {"urls": [], "replies": []}

    def fake_post(url, json=None, headers=None, timeout=None):
        box["urls"].append(url)
        return box["replies"].pop(0) if box["replies"] else _gemini_ok()

    monkeypatch.setattr(requests, "post", fake_post)
    return box


@pytest.fixture
def ledger(client, monkeypatch):
    box = {"claims": [], "finished": []}
    monkeypatch.setattr(client.budget, "claim", lambda source, student_id=None: box["claims"].append(source) or len(box["claims"]))
    monkeypatch.setattr(client.budget, "finish", lambda lid, ok: box["finished"].append((lid, ok)))
    return box


def test_call_is_claimed_then_finished(client, gemini_posts, ledger):
    out = client.generate("prompt", model="gemini-2.0-flash", rate_limit=0)

    assert out == {"analyses": [{"score": 80}]}
    assert ledger["claims"] == ["gemini_scout"]
    assert ledger["finished"] == [(1, True)]
    assert len(gemini_posts["urls"]) == 1


def test_each_fallback_attempt_is_claimed(client, gemini_posts, ledger):
    gemini_posts["replies"] = [_Resp(429), _gemini_ok()]

    client.generate("prompt", model="gemini-2.0-flash", rate_limit=0, source="gemini_item_gen")

    assert ledger["claims"] == ["gemini_item_gen", "gemini_item_gen"]
    assert ledger["finished"] == [(1, False), (2, True)]


def test_refused_budget_sends_nothing(client, gemini_posts, monkeypatch):
    def refuse(source, student_id=None):
        raise client.budget.BudgetRefused("daily_cap_reached")

    monkeypatch.setattr(client.budget, "claim", refuse)

    assert client.generate("prompt", rate_limit=0) == {}
    assert gemini_posts["urls"] == []


def test_unconfigured_budget_fails_closed(client, gemini_posts, monkeypatch):
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    assert client.generate("prompt", rate_limit=0) == {}
    assert gemini_posts["urls"] == []


def test_budget_claim_uses_service_role_rpc(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://db.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    sent = {}

    def fake_post(url, json=None, headers=None, timeout=None):
        sent.update(url=url, json=json, headers=headers)
        return _Resp(200, {"allowed": True, "ledger_id": 7})

    monkeypatch.setattr(requests, "post", fake_post)

    assert client.budget.claim("gemini_scout") == 7
    assert sent["url"] == "https://db.example/rest/v1/rpc/claim_ai_call"
    assert sent["json"] == {"p_source": "gemini_scout", "p_student_id": None}
    assert sent["headers"]["Authorization"] == "Bearer svc"


def test_budget_refusal_reason_is_surfaced(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://db.example")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "svc")
    monkeypatch.setattr(requests, "post", lambda *a, **k: _Resp(200, {"allowed": False, "reason": "feature_disabled"}))

    with pytest.raises(client.budget.BudgetRefused) as exc:
        client.budget.claim("gemini_scout")
    assert exc.value.reason == "feature_disabled"


def test_item_generator_loads_the_metered_client(monkeypatch, gemini_posts):
    import api.item_generator as gen

    assert gen.gemini_generate is not None  # the hyphenated path used to make this always None
    monkeypatch.setenv("GEMINI_API_KEY", "g-key")
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    assert gen.gemini_generate("prompt") == {}  # budget not configured: refused, nothing sent
    assert gemini_posts["urls"] == []
