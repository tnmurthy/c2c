"""
Unit tests for api/services/typesafe_service.py.

The HTTP layer is mocked with responses shaped exactly like the documented
POST https://api.typesafe.ai/v1/systemone contract, so no network calls are made.
"""
import io
import json
import urllib.error

import pytest

from api.services import typesafe_service as ts
from api.services.typesafe_heuristics import HEURISTIC_PROVIDER

RESPONSES = [
    {"item_id": "q1", "dimension": "IQ", "response": 4},
    {"item_id": "q2", "dimension": "AQ", "response": 5},
    {"item_id": "q3", "dimension": "EQ", "response": 3},
]


class _FakeResp(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def _score(level: float) -> dict:
    return {"type": "score", "score": level, "confidence": 0.7,
            "probabilities": {"0": 0.0, "1": 0.1, "2": 0.2, "3": 0.6, "4": 0.1}}


def _evaluate_answers() -> dict:
    answers = {dim: _score(3.0) for dim in ts.DIMENSIONS}
    answers["archetype"] = {"type": "choice", "choice": "Leader", "confidence": 0.81,
                            "probabilities": {"Builder": 0.1, "Leader": 0.8, "Rainmaker": 0.05, "Anchor": 0.05}}
    answers["placement_ready"] = {"type": "noul", "noul": 0.91}
    answers["requires_intervention"] = {"type": "noul", "noul": 0.08}
    return answers


@pytest.fixture
def ledger(monkeypatch):
    """Budget always grants the claim; records claims and outcomes."""
    box = {"claims": [], "finished": []}

    def claim(source, student_id=None):
        box["claims"].append((source, student_id))
        return len(box["claims"])

    monkeypatch.setattr(ts.ai_budget, "claim_ai_call", claim)
    monkeypatch.setattr(ts.ai_budget, "finish_ai_call", lambda lid, ok: box["finished"].append((lid, ok)))
    return box


@pytest.fixture
def live_key(monkeypatch, ledger):
    monkeypatch.setenv("TYPESAFE_API_KEY", "test-key")


@pytest.fixture
def no_key(monkeypatch):
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    monkeypatch.delenv("TYPESAFE_KEY", raising=False)


@pytest.fixture
def capture(monkeypatch):
    """Patches urlopen; returns a dict holding the sent request and the answers to reply with."""
    box = {"answers": {}, "request": None}

    def fake_urlopen(req, timeout):
        box["request"] = req
        body = {"model": "jev-latest", "answers": box["answers"], "usage": {"input_tokens": 10, "output_tokens": 2}}
        return _FakeResp(json.dumps(body).encode())

    monkeypatch.setattr(ts.urllib.request, "urlopen", fake_urlopen)
    return box


def test_evaluate_live_sends_documented_request_shape(live_key, capture):
    capture["answers"] = _evaluate_answers()

    ts.TypeSafeService().evaluate(RESPONSES, "Asha")

    req = capture["request"]
    assert req.full_url == "https://api.typesafe.ai/v1/systemone"
    assert req.headers["Authorization"] == "Bearer test-key"
    body = json.loads(req.data)
    assert body["model"] == "jev-latest"
    assert body["state"] == {"responses": RESPONSES}
    for q in body["questions"].values():
        assert set(q) == {"type", "instructions", "criteria"}
    assert body["questions"]["IQ"]["criteria"] == ts.DIMENSION_LEVELS
    assert set(body["questions"]["placement_ready"]["criteria"]) == {"true", "false"}


def test_evaluate_live_parses_real_answer_fields(live_key, capture):
    capture["answers"] = _evaluate_answers()

    res = ts.TypeSafeService().evaluate(RESPONSES, "Asha")

    assert res.is_live_api is True
    assert res.primary_archetype.value == "Leader"
    assert res.archetype_probabilities["Leader"] == 0.8
    assert res.ai_confidence == 0.81
    assert res.scores["IQ"].score == 75.0  # level 3 of 0-4
    assert res.scores["IQ"].confidence == 0.7
    assert res.placement_ready is True and res.placement_ready_probability == 0.91
    assert res.requires_intervention is False and res.requires_intervention_probability == 0.08


def test_evaluate_falls_back_and_labels_heuristic_on_http_error(live_key, monkeypatch):
    def boom(req, timeout):
        raise urllib.error.HTTPError(req.full_url, 401, "Unauthorized", {}, io.BytesIO(b"bad key"))

    monkeypatch.setattr(ts.urllib.request, "urlopen", boom)

    res = ts.TypeSafeService().evaluate(RESPONSES, "Asha")

    assert res.is_live_api is False
    assert res.model_provider == HEURISTIC_PROVIDER
    assert "TypeSafe" not in res.scores["IQ"].rationale


def test_evaluate_rejects_empty_responses(no_key):
    with pytest.raises(ValueError):
        ts.TypeSafeService().evaluate([], "Asha")


def test_heuristic_does_not_invent_missing_dimensions(no_key):
    res = ts.TypeSafeService().evaluate(RESPONSES, "Asha")

    assert set(res.scores) == {"IQ", "AQ", "EQ"}
    assert res.scores["AQ"].score == 100.0


def test_featurize_live_builds_vector_from_answers(live_key, capture):
    answers = {}
    for p in ts.DEFAULT_PROBES:
        answers[p["name"]] = _score(2.9) if p["kind"] == "intensity" else {"type": "noul", "noul": 0.66}
    capture["answers"] = answers

    res = ts.TypeSafeService().featurize("Built Kafka consumers in Go.", "Ravi")

    assert res.is_live_api is True
    assert len(res.numeric_vector) == 11 and len(res.feature_names) == 11
    assert res.features["systems_architecture"].mean == 2.9
    assert res.features["systems_architecture"].spread_sd > 0
    assert res.features["concurrency_experience"].mean == 0.66
    body = json.loads(capture["request"].data)
    assert body["questions"]["concurrency_experience"]["type"] == "noul"
    assert body["questions"]["production_engineering"]["criteria"] == ts.INTENSITY_LEVELS


def test_featurize_skips_paid_call_for_empty_text(live_key, capture):
    res = ts.TypeSafeService().featurize("   ", "Ravi")

    assert capture["request"] is None
    assert res.is_live_api is False


def test_legacy_key_name_is_accepted(monkeypatch):
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
    monkeypatch.setenv("TYPESAFE_KEY", "legacy")

    assert ts.TypeSafeService().api_key == "legacy"


def test_live_call_is_claimed_and_finished_in_ledger(live_key, capture, ledger):
    capture["answers"] = _evaluate_answers()

    ts.TypeSafeService().evaluate(RESPONSES, "Asha", student_id="s-1")

    assert ledger["claims"] == [("typesafe_evaluate", "s-1")]
    assert ledger["finished"] == [(1, True)]


def test_budget_refusal_makes_no_api_call(live_key, capture, monkeypatch):
    def refuse(source, student_id=None):
        raise ts.ai_budget.BudgetRefused("daily_cap_reached")

    monkeypatch.setattr(ts.ai_budget, "claim_ai_call", refuse)

    res = ts.TypeSafeService().featurize("Built Kafka consumers in Go.", "Ravi")

    assert capture["request"] is None
    assert res.is_live_api is False


def test_failed_call_is_recorded_as_error(live_key, ledger, monkeypatch):
    def boom(req, timeout):
        raise urllib.error.URLError("timeout")

    monkeypatch.setattr(ts.urllib.request, "urlopen", boom)

    ts.TypeSafeService().featurize("Built Kafka consumers in Go.", "Ravi")

    assert ledger["finished"] == [(1, False)]


def test_budget_check_failure_refuses_the_call(monkeypatch):
    class Broken:
        def rpc(self, *a, **k):
            raise ConnectionError("db down")

    monkeypatch.setattr(ts.ai_budget, "get_service_client", lambda: Broken())

    with pytest.raises(ts.ai_budget.BudgetRefused) as exc:
        ts.ai_budget.claim_ai_call("typesafe_featurize")
    assert exc.value.reason == "budget_check_unavailable"
