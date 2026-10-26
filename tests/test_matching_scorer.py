"""
P3-B candidate matching: pure scoring, the cheap 5Q filter before paid calls,
reuse of stored judgments, employer decisions kept on re-score, and access rules.
"""
import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.services import typesafe_service as ts
from services.matching import scorer

FULL_5Q = {"IQ": 100, "AQ": 100, "EQ": 100, "SQ": 100, "SpQ": 100}


def _student(sid: str, bio: str = "Python services with pytest suites.") -> dict:
    return {"id": sid, "full_name": f"S{sid}", "bio": bio, "skills": ["Python"], "department": "CSE"}


def _evidence(level: float) -> dict:
    return {"Python": {"level": level, "confidence": 0.8}, "Testing": {"level": level, "confidence": 0.7}}


# ── pure functions ─────────────────────────────────────────────────────────

def test_calculate_match_score_is_unchanged_for_existing_callers():
    assert scorer.calculate_match_score(FULL_5Q, "tech") == 100.0
    from api.routers.employer_router import calculate_match_score
    assert calculate_match_score is scorer.calculate_match_score


def test_clean_requirements_trims_dedupes_and_limits():
    reqs = [" Python ", "python", "", "SQL"] + [f"R{i}" for i in range(20)]
    out = scorer.clean_requirements(reqs)
    assert out[:2] == ["Python", "SQL"]
    assert len(out) == scorer.MAX_REQUIREMENTS
    assert scorer.clean_requirements(None) == []


def test_evidence_and_fit_score_blend():
    assert scorer.evidence_score(_evidence(4)) == 100.0
    assert scorer.evidence_score(_evidence(2)) == 50.0
    assert scorer.fit_score(80, 50) == 65.0
    assert scorer.fit_score(80, None) == 80.0  # unjudged: 5Q alone


def test_hash_changes_with_profile_or_requirements():
    job = {"title": "SDE", "description": "d"}
    base = scorer.match_input_hash("text", job, ["Python"])
    assert base != scorer.match_input_hash("text2", job, ["Python"])
    assert base != scorer.match_input_hash("text", job, ["Python", "SQL"])


# ── shortlist: cheap filter and reuse ──────────────────────────────────────

@pytest.fixture
def judge_calls(monkeypatch):
    calls = []

    def fake(text, job, reqs, student_id=None):
        calls.append(student_id)
        return _evidence(3)

    monkeypatch.setattr(scorer.typesafe_service, "judge_requirements", fake)
    return calls


def _candidates(n: int) -> list:
    return [{"student": _student(str(i)), "five_q": 100 - i} for i in range(n)]


def test_only_top_judge_limit_by_5q_are_sent_to_the_model(judge_calls, monkeypatch):
    monkeypatch.setattr(scorer, "JUDGE_LIMIT", 3)

    judged = scorer.judge_shortlist(_candidates(10), {"title": "t", "description": "d"}, ["Python"], {})

    assert sorted(judge_calls) == ["0", "1", "2"]
    assert set(judged) == {"0", "1", "2"}


def test_unchanged_candidate_reuses_stored_judgment(judge_calls):
    job = {"title": "t", "description": "d"}
    c = _candidates(1)
    h = scorer.match_input_hash(scorer.profile_text(c[0]["student"]), job, ["Python"])
    existing = {"0": {"input_hash": h, "evidence": _evidence(4), "status": "PENDING"}}

    judged = scorer.judge_shortlist(c, job, ["Python"], existing)

    assert judge_calls == []
    assert judged["0"]["evidence"] == _evidence(4)


def test_empty_profile_is_not_sent(judge_calls):
    c = [{"student": {"id": "e", "full_name": "E", "bio": "", "skills": [], "department": ""}, "five_q": 90}]

    judged = scorer.judge_shortlist(c, {"title": "t", "description": "d"}, ["Python"], {})

    assert judge_calls == [] and judged == {}


def test_unjudged_candidates_rank_on_5q_alone():
    cands = [{"student": _student("a"), "five_q": 90.0}, {"student": _student("b"), "five_q": 70.0}]
    judged = {"b": {"evidence": _evidence(4), "input_hash": "h"}}

    top = scorer.rank_matches(cands, judged, "job")

    assert [(r["student_id"], r["fit_score"], r["rank"]) for r in top] == [("a", 90.0, 1), ("b", 85.0, 2)]
    assert top[0]["evidence_score"] is None


# ── end to end over a fake database ────────────────────────────────────────

class FakeDB:
    """Minimal supabase-py chain over in-memory tables."""

    def __init__(self, tables):
        self.tables = tables
        self.writes = []

    def table(self, name):
        return _Query(self, name)


class _Query:
    def __init__(self, db, name):
        self.db, self.name, self.filters, self.op, self.payload = db, name, [], "select", None

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r.get(col) == val)
        return self

    def in_(self, col, vals):
        vals = set(vals)
        self.filters.append(lambda r: r.get(col) in vals)
        return self

    def order(self, *_a, **_k):
        return self

    def upsert(self, rows, on_conflict=None):
        self.op, self.payload = "upsert", rows
        return self

    def update(self, row):
        self.op, self.payload = "update", row
        return self

    def delete(self):
        self.op = "delete"
        return self

    def execute(self):
        rows = self.db.tables.setdefault(self.name, [])
        hit = [r for r in rows if all(f(r) for f in self.filters)]
        self.db.writes.append((self.name, self.op))
        if self.op == "upsert":
            for new in self.payload:
                cur = next((r for r in rows if r.get("job_id") == new.get("job_id") and r.get("student_id") == new.get("student_id")), None)
                if cur:
                    cur.update(new)
                else:
                    rows.append({"status": "PENDING", **new})
        elif self.op == "update":
            for r in hit:
                r.update(self.payload)
        elif self.op == "delete":
            self.db.tables[self.name] = [r for r in rows if r not in hit]
        return type("Res", (), {"data": hit})()


def _db(n_students=3, existing=None):
    students = [_student(str(i)) for i in range(n_students)]
    return FakeDB({
        "job_postings": [{"id": "job1", "title": "SDE", "description": "Backend", "requirements": ["Python", "Testing"],
                          "role_type": "tech", "employer_id": "emp1"}],
        "students": students,
        "assessments": [{"student_id": s["id"], "dimension_scores": {k: 90 - 10 * i for k in FULL_5Q}, "created_at": "2026-10-01"}
                        for i, s in enumerate(students)],
        "job_candidate_matches": existing or [],
        "match_alerts": [],
    })


def test_score_job_stores_ranked_top_and_updates_legacy_map(judge_calls):
    db = _db()

    summary = scorer.score_candidates_for_job(db, "job1")

    rows = sorted(db.tables["job_candidate_matches"], key=lambda r: r["rank"])
    assert [r["student_id"] for r in rows] == ["0", "1", "2"]
    assert rows[0]["evidence_score"] == 75.0
    assert db.tables["job_postings"][0]["match_scores"]["0"] == rows[0]["fit_score"]
    assert summary["evidence_judged"] == 3


def test_rescore_keeps_employer_decisions(judge_calls, monkeypatch):
    monkeypatch.setattr(scorer, "TOP_N", 1)
    existing = [
        {"job_id": "job1", "student_id": "2", "status": "SHORTLISTED", "input_hash": None, "evidence": {}},
        {"job_id": "job1", "student_id": "1", "status": "PENDING", "input_hash": None, "evidence": {}},
    ]
    db = _db(existing=existing)

    scorer.score_candidates_for_job(db, "job1")

    remaining = {r["student_id"]: r["status"] for r in db.tables["job_candidate_matches"]}
    assert remaining["2"] == "SHORTLISTED"  # outside top 1, but a decision: kept
    assert "1" not in remaining              # outside top 1 and undecided: removed
    assert remaining["0"] == "PENDING"


def test_job_without_requirements_makes_no_model_call(judge_calls):
    db = _db()
    db.tables["job_postings"][0]["requirements"] = []

    scorer.score_candidates_for_job(db, "job1")

    assert judge_calls == []


# ── TypeSafe requirement call ──────────────────────────────────────────────

def test_judge_requirements_request_shape_and_budget_source(monkeypatch):
    monkeypatch.setenv("TYPESAFE_API_KEY", "k")
    claims, sent = [], {}
    monkeypatch.setattr(ts.ai_budget, "claim_ai_call", lambda src, sid=None: claims.append((src, sid)) or 1)
    monkeypatch.setattr(ts.ai_budget, "finish_ai_call", lambda *a, **k: None)

    def fake_post(self, state, questions):
        sent.update(state=state, questions=questions)
        return {k: {"type": "score", "score": 3.0, "confidence": 0.7} for k in questions}

    monkeypatch.setattr(ts.TypeSafeService, "_post", fake_post)

    out = ts.TypeSafeService().judge_requirements("Python dev", {"title": "SDE", "description": "d"}, ["Python", "SQL"], "s1")

    assert claims == [("typesafe_match", "s1")]
    assert out == {"Python": {"level": 3.0, "confidence": 0.7}, "SQL": {"level": 3.0, "confidence": 0.7}}
    assert sent["state"] == {"candidate": {"profile_text": "Python dev"}, "job": {"title": "SDE", "description": "d"}}
    assert sent["questions"]["req_1"]["criteria"] == ts.REQUIREMENT_LEVELS
    assert '"SQL"' in sent["questions"]["req_1"]["instructions"]


def test_judge_requirements_returns_none_when_budget_refuses(monkeypatch):
    monkeypatch.setenv("TYPESAFE_API_KEY", "k")

    def refuse(*a, **k):
        raise ts.ai_budget.BudgetRefused("daily_cap_reached")

    monkeypatch.setattr(ts.ai_budget, "claim_ai_call", refuse)

    assert ts.TypeSafeService().judge_requirements("text", {"title": "", "description": ""}, ["Python"]) is None


# ── endpoint access rules ──────────────────────────────────────────────────

def _app(db, role, user_id):
    from api.deps import get_current_user, require_admin_supabase
    from api.routers.employer_router import router

    class U:
        id = user_id
        app_metadata = {"role": role}

    from fastapi.responses import JSONResponse
    from api.exceptions import APIException

    app = FastAPI()
    # Same status mapping as api/main.py's handlers.
    app.add_exception_handler(APIException, lambda req, exc: JSONResponse({"detail": exc.message}, status_code=exc.status_code))
    app.include_router(router, prefix="/api")
    app.dependency_overrides[get_current_user] = lambda: U()
    app.dependency_overrides[require_admin_supabase] = lambda: db
    return TestClient(app, raise_server_exceptions=False)


def test_employer_cannot_read_another_employers_candidates():
    db = _db()
    db.tables["employers"] = [{"id": "emp2", "auth_id": "user2"}]

    res = _app(db, "employer", "user2").get("/api/employer/jobs/job1/candidates")

    assert res.status_code == 403


def test_owning_employer_reads_ranked_candidates(judge_calls):
    db = _db()
    db.tables["employers"] = [{"id": "emp1", "auth_id": "user1"}]
    scorer.score_candidates_for_job(db, "job1")

    res = _app(db, "employer", "user1").get("/api/employer/jobs/job1/candidates")

    assert res.status_code == 200
    body = res.json()
    assert [c["rank"] for c in body] == [1, 2, 3]
    assert body[0]["evidence"]["Python"]["level"] == 3


def test_job_posted_webhook_requires_secret(monkeypatch):
    client = _app(_db(), "admin", "x")
    monkeypatch.delenv("SUPABASE_WEBHOOK_SECRET", raising=False)
    assert client.post("/api/webhook/job-posted", json={"record": {"id": "job1"}}).status_code == 503

    monkeypatch.setenv("SUPABASE_WEBHOOK_SECRET", "s3cret")
    assert client.post("/api/webhook/job-posted", json={}, headers={"x-webhook-secret": "nope"}).status_code == 401


# ── employer ranked-candidates screen: job header and status decisions ─────

def _owned_db(judge_calls):
    db = _db()
    db.tables["employers"] = [{"id": "emp1", "auth_id": "user1"}, {"id": "emp2", "auth_id": "user2"}]
    scorer.score_candidates_for_job(db, "job1")
    return db


def test_owner_reads_job_header(judge_calls):
    res = _app(_owned_db(judge_calls), "employer", "user1").get("/api/employer/jobs/job1")

    assert res.status_code == 200
    assert res.json()["requirements"] == ["Python", "Testing"]


def test_other_employer_cannot_read_job_header(judge_calls):
    assert _app(_owned_db(judge_calls), "employer", "user2").get("/api/employer/jobs/job1").status_code == 403


def test_owner_shortlists_a_candidate(judge_calls):
    db = _owned_db(judge_calls)

    res = _app(db, "employer", "user1").patch("/api/employer/jobs/job1/candidates/0", json={"status": "SHORTLISTED"})

    assert res.status_code == 200
    row = next(r for r in db.tables["job_candidate_matches"] if r["student_id"] == "0")
    assert row["status"] == "SHORTLISTED"


def test_status_must_be_a_known_decision(judge_calls):
    res = _app(_owned_db(judge_calls), "employer", "user1").patch(
        "/api/employer/jobs/job1/candidates/0", json={"status": "HIRED_ALREADY"})
    assert res.status_code == 422


def test_other_employer_cannot_change_status(judge_calls):
    db = _owned_db(judge_calls)

    res = _app(db, "employer", "user2").patch("/api/employer/jobs/job1/candidates/0", json={"status": "REJECTED"})

    assert res.status_code == 403
    assert all(r["status"] == "PENDING" for r in db.tables["job_candidate_matches"])


def test_status_on_unranked_candidate_is_404(judge_calls):
    res = _app(_owned_db(judge_calls), "employer", "user1").patch(
        "/api/employer/jobs/job1/candidates/nobody", json={"status": "SHORTLISTED"})
    assert res.status_code == 404


def test_shortlist_survives_rescore(judge_calls):
    db = _owned_db(judge_calls)
    _app(db, "employer", "user1").patch("/api/employer/jobs/job1/candidates/2", json={"status": "SHORTLISTED"})

    scorer.score_candidates_for_job(db, "job1")

    row = next(r for r in db.tables["job_candidate_matches"] if r["student_id"] == "2")
    assert row["status"] == "SHORTLISTED"
