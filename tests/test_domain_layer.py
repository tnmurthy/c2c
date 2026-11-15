"""Unit tests for api/domain (R1 refactor). No database: a tiny fake client."""
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from api.domain.assessments import scoring
from api.domain.assessments.policy import resolve_tenant_id, retake_cooldown_until
from api.domain.students.access import authorize_student_read
from api.exceptions import NotFoundError, PermissionDeniedError


# --- fake supabase client ---------------------------------------------------

class _Q:
    def __init__(self, rows):
        self._rows = rows
    def select(self, *a, **k): return self
    def eq(self, *a, **k): return self
    def order(self, *a, **k): return self
    def limit(self, *a, **k): return self
    def execute(self): return SimpleNamespace(data=self._rows)


class FakeClient:
    def __init__(self, tables):
        self.tables = tables
    def table(self, name):
        return _Q(self.tables.get(name, []))


def user(role=None, uid="u1", email="x@college.edu", profile_id=None):
    meta = {}
    if role: meta["role"] = role
    if profile_id: meta["profile_id"] = profile_id
    return SimpleNamespace(id=uid, email=email, app_metadata=meta)


# --- scoring ------------------------------------------------------------------

ITEMS = {
    "l1": {"id": "l1", "primary_dimension": "EQ", "item_type": "likert", "scoring_logic": {"raw": "High score = high EQ"}},
    "l2": {"id": "l2", "primary_dimension": "EQ", "item_type": "likert", "scoring_logic": {"raw": "Reverse scored"}},
    "c1": {"id": "c1", "primary_dimension": "IQ", "item_type": "cognitive", "scoring_logic": "Correct: B"},
    "s1": {"id": "s1", "primary_dimension": "SQ", "item_type": "SJT", "scoring_logic": "A: 1, B: 4, C: 2"},
}


def test_evaluate_normalises_each_dimension():
    responses = [
        {"item_id": "l1", "response": 5},   # 5
        {"item_id": "l2", "response": 1},   # reverse -> 5
        {"item_id": "c1", "response": "B"}, # correct
        {"item_id": "s1", "response": "C"}, # 2 of max 4
    ]
    r = scoring.evaluate(responses, ITEMS)
    assert r["dimension_scores"] == {"IQ": 100, "EQ": 100, "SQ": 50, "AQ": 0, "SpQ": 0}
    assert r["percentile_bands"]["IQ"] == "Top 10%"
    assert r["primary_profile"] == "Anchor"  # IQ+EQ = 200 is the top founder fit
    assert r["development_report"]["percentile_bands"] == r["percentile_bands"]


def test_primary_profile_is_highest_founder_fit():
    fit = scoring.founder_fit({"IQ": 100, "EQ": 100, "SQ": 50, "AQ": 0, "SpQ": 0})
    assert fit == {"Builder": 100, "Leader": 150, "Rainmaker": 50, "Anchor": 200}
    assert scoring.primary_profile(fit) == "Anchor"


def test_unknown_items_are_ignored():
    r = scoring.evaluate([{"item_id": "missing", "response": 3}], ITEMS)
    assert all(v == 0 for v in r["dimension_scores"].values())


def test_development_report_flags_low_aq_and_high_spq():
    rep = scoring.generate_development_report({"AQ": 10, "SpQ": 90}, "Builder")
    assert rep["profile_summary"].startswith("Builders")
    assert any("AQ is below 50" in f for f in rep["actionable_feedback"])
    assert any("SpQ is high" in f for f in rep["actionable_feedback"])


# --- policy -------------------------------------------------------------------

def test_resolve_tenant_falls_back_to_first_tenant():
    c = FakeClient({"students": [{"tenant_id": None}], "tenants": [{"tenant_id": "t9"}]})
    assert resolve_tenant_id(c, "s1") == "t9"


def test_resolve_tenant_missing_student():
    with pytest.raises(NotFoundError):
        resolve_tenant_id(FakeClient({}), "s1")


def test_cooldown_active_and_expired():
    c = FakeClient({"assessments": [{"created_at": "2026-01-01T00:00:00Z"}],
                    "tenants": [{"retake_cooldown_days": 30}]})
    assert retake_cooldown_until(c, "s1", "t1", now=datetime(2026, 1, 10, tzinfo=timezone.utc)) == "2026-01-31"
    assert retake_cooldown_until(c, "s1", "t1", now=datetime(2026, 3, 1, tzinfo=timezone.utc)) is None
    assert retake_cooldown_until(FakeClient({}), "s1", "t1") is None


# --- access -------------------------------------------------------------------

def test_admin_always_allowed():
    authorize_student_read(FakeClient({}), user("admin"), "s1", allow_employer=False)


@pytest.mark.parametrize("role", ["student", None])
def test_student_or_missing_role_only_own_record(role):
    own = FakeClient({"students": [{"auth_id": "u1"}]})
    authorize_student_read(own, user(role), "s1", allow_employer=True)
    other = FakeClient({"students": [{"auth_id": "someone-else"}]})
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(other, user(role), "s1", allow_employer=True)


def test_institution_by_profile_or_domain():
    c = FakeClient({"students": [{"institution_id": "i1", "email": "a@other.edu"}]})
    authorize_student_read(c, user("institution", profile_id="i1"), "s1", allow_employer=False)
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(c, user("institution", profile_id="i2", email="tpo@college.edu"), "s1", allow_employer=False)
    same_domain = FakeClient({"students": [{"institution_id": "iX", "email": "a@college.edu"}]})
    authorize_student_read(same_domain, user("institution", email="tpo@college.edu"), "s1", allow_employer=False)


def test_employer_gate_and_unknown_role():
    authorize_student_read(FakeClient({}), user("employer"), "s1", allow_employer=True)
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(FakeClient({}), user("employer"), "s1", allow_employer=False)
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(FakeClient({}), user("hacker"), "s1", allow_employer=True)
