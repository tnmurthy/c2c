"""
Unit tests for api/services/candidate_features.py: the model is not called
for cached, unchanged profiles, and a cold cache is bounded per request.
"""
from datetime import datetime, timezone

import pytest

from api.schemas.typesafe import TypeSafeFeaturizeResponse
from api.services import candidate_features as cf
from api.services.typesafe_heuristics import featurize_heuristic


def _student(sid: str, bio: str = "Built Kafka consumers in Go.") -> dict:
    return {"id": sid, "full_name": f"Student {sid}", "bio": bio, "skills": ["Go"], "department": "CSE"}


def _live(name: str = "x") -> TypeSafeFeaturizeResponse:
    res = featurize_heuristic("kafka", name, cf.DEFAULT_PROBES)
    return res.model_copy(update={"is_live_api": True, "model_provider": "TypeSafe AI System One (Jev)",
                                  "timestamp": datetime.now(timezone.utc).isoformat()})


class FakeTable:
    def __init__(self, rows):
        self.rows = rows
        self.upserted = []
        self._ids = None

    def table(self, name):
        assert name == "candidate_features"
        return self

    def select(self, *_):
        return self

    def in_(self, _col, ids):
        self._ids = set(ids)
        return self

    def upsert(self, rows):
        self.upserted.extend(rows)
        return self

    def execute(self):
        data = [r for r in self.rows if self._ids is None or r["student_id"] in self._ids]
        return type("Res", (), {"data": data})()


@pytest.fixture
def featurize_calls(monkeypatch):
    calls = []

    def fake(text, name, student_id=None):
        calls.append(student_id)
        return _live(name)

    monkeypatch.setattr(cf.typesafe_service, "featurize", fake)
    return calls


def test_cached_unchanged_profile_is_not_featurized_again(featurize_calls):
    s = _student("a")
    row = {"student_id": "a", "input_hash": cf.input_hash(cf.profile_text(s)),
           "featurize_response": _live().model_dump(mode="json")}

    out = cf.features_for_students(FakeTable([row]), [s])

    assert featurize_calls == []
    assert out["a"]["is_live_api"] is True


def test_changed_profile_is_featurized_and_cache_updated(featurize_calls):
    s = _student("a", bio="Now also leads a robotics club.")
    stale = {"student_id": "a", "input_hash": "old", "featurize_response": _live().model_dump(mode="json")}
    client = FakeTable([stale])

    cf.features_for_students(client, [s])

    assert featurize_calls == ["a"]
    assert client.upserted[0]["input_hash"] == cf.input_hash(cf.profile_text(s))


def test_cold_cache_is_truncated_to_max_live_per_request(featurize_calls, monkeypatch):
    monkeypatch.setattr(cf, "MAX_LIVE_PER_REQUEST", 3)
    students = [_student(str(i)) for i in range(5)]

    out = cf.features_for_students(FakeTable([]), students)

    assert len(featurize_calls) == 3
    assert len(out) == 5
    assert sum(1 for t in out.values() if not t["is_live_api"]) == 2


def test_empty_profile_is_not_sent_to_the_model(featurize_calls):
    s = {"id": "e", "full_name": "Empty", "bio": "", "skills": [], "department": ""}

    out = cf.features_for_students(FakeTable([]), [s])

    assert featurize_calls == []
    assert out["e"]["is_live_api"] is False


def test_heuristic_results_are_not_cached(monkeypatch):
    monkeypatch.setattr(cf.typesafe_service, "featurize",
                        lambda text, name, student_id=None: featurize_heuristic(text, name, cf.DEFAULT_PROBES))
    client = FakeTable([])

    cf.features_for_students(client, [_student("a")])

    assert client.upserted == []
