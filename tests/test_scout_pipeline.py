"""market-scout pipeline: min_score filters scored items only; AI failures keep items unscored."""
import sys
from pathlib import Path

import pytest

SCOUT = Path(__file__).resolve().parents[1] / "services" / "market-scout"


@pytest.fixture
def pipeline(monkeypatch):
    monkeypatch.syspath_prepend(str(SCOUT))
    for mod in ("ai.pipeline", "ai.client", "ai"):
        sys.modules.pop(mod, None)
    import ai.pipeline as p
    return p


ITEMS = [{"url": f"https://jobs.example/{i}", "name": f"Job {i}"} for i in range(3)]


def test_ai_failure_keeps_items_unscored(pipeline, monkeypatch):
    monkeypatch.setattr(pipeline, "generate", lambda *a, **k: {})
    out = pipeline.analyse_batch(ITEMS)
    assert [o["url"] for o in out] == [i["url"] for i in ITEMS]
    assert all(o["ai_score"] is None for o in out)


def test_min_score_filters_only_scored_items(pipeline, monkeypatch):
    verdicts = {"analyses": [{"score": 90, "summary": "s"}, {"score": 10, "summary": "s"}]}
    monkeypatch.setattr(pipeline, "generate", lambda *a, **k: verdicts)
    out = pipeline.analyse_batch(ITEMS)  # config.yaml min_score = 50
    by_url = {o["url"]: o for o in out}
    assert by_url["https://jobs.example/0"]["ai_score"] == 90      # scored, kept
    assert "https://jobs.example/1" not in by_url                   # scored low, filtered
    assert by_url["https://jobs.example/2"]["ai_score"] is None     # no verdict, kept unscored


def test_split_for_scoring_skips_already_scored(monkeypatch):
    monkeypatch.syspath_prepend(str(SCOUT))
    sys.modules.pop("storage.supabase_sync", None)
    sys.modules.pop("storage", None)
    from storage.supabase_sync import split_for_scoring
    items = [{"url": u} for u in ("new", "unscored", "scored")]
    to_score, done = split_for_scoring(items, {"unscored": None, "scored": 77})
    assert [i["url"] for i in to_score] == ["new", "unscored"]
    assert [i["url"] for i in done] == ["scored"]
