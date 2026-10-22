"""
Tests for the admin Costs page backend: advice rules (pure), budget arithmetic,
and the /api/costs endpoints' role and validation checks.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_current_user, require_admin_supabase
from api.routers.costs_router import router
from api.services.cost_advice import build_advice, cost_inr, suggested_account_cap

ADMIN_ID = "6f1c2a3e-1111-4c2d-9e7b-2b9a0c3d4e5f"


def _summary(**over) -> dict:
    base = {
        "today": "2026-10-22",
        "today_calls": {"featurize_calls": 0, "evaluate_calls": 0},
        "month_to_date_calls": 0,
        "month_error_calls": 0,
        "projected_month_calls": 0,
        "by_day": [],
        "account_max_calls_per_day": 500,
        "featurize_max_calls_per_day": 300,
        "evaluate_max_calls_per_day": 200,
        "price_per_call_inr": 0.05,
        "monthly_budget_inr": 1000,
    }
    return {**base, **over}


def _ids(summary: dict) -> set:
    return {a["id"] for a in build_advice(summary)}


# ── budget arithmetic ──────────────────────────────────────────────────────

def test_suggested_cap_divides_budget_by_price_over_thirty_days():
    assert suggested_account_cap(_summary(price_per_call_inr=0.05, monthly_budget_inr=1500)) == 1000


def test_suggested_cap_needs_both_price_and_budget():
    assert suggested_account_cap(_summary(price_per_call_inr=None)) is None
    assert suggested_account_cap(_summary(monthly_budget_inr=None)) is None


def test_suggested_cap_is_at_least_one():
    assert suggested_account_cap(_summary(price_per_call_inr=100, monthly_budget_inr=1)) == 1


def test_cost_is_none_without_price():
    assert cost_inr(10, None) is None
    assert cost_inr(10, 0.5) == 5


# ── advice rules ───────────────────────────────────────────────────────────

def test_healthy_account_gets_no_advice():
    assert _ids(_summary()) == set()


def test_no_account_cap_is_flagged():
    assert "no-account-cap" in _ids(_summary(account_max_calls_per_day=None))


def test_projected_over_budget_is_flagged_with_suggested_cap():
    advice = build_advice(_summary(projected_month_calls=30_000))  # 30k * 0.05 = 1500 > 1000
    over = next(a for a in advice if a["id"] == "over-budget")
    assert over["level"] == "act"
    assert "666 calls" in over["detail"]


def test_missing_price_or_budget_is_flagged():
    assert "no-budget" in _ids(_summary(price_per_call_inr=None))


def test_cap_reached_today_is_flagged():
    s = _summary(today_calls={"featurize_calls": 300, "evaluate_calls": 0})
    assert "featurize-cap-reached" in _ids(s)


def test_cap_far_above_busiest_day_is_flagged():
    s = _summary(by_day=[{"day": "2026-10-21", "featurize_calls": 10, "evaluate_calls": 0}])
    advice = {a["id"]: a for a in build_advice(s)}
    assert "featurize-headroom" in advice
    assert "near 30" in advice["featurize-headroom"]["detail"]


def test_disabled_feature_is_not_flagged_for_headroom():
    s = _summary(featurize_max_calls_per_day=0,
                 by_day=[{"day": "2026-10-21", "featurize_calls": 10, "evaluate_calls": 0}])
    assert not {"featurize-headroom", "featurize-cap-reached"} & _ids(s)


def test_high_error_rate_is_flagged_only_with_enough_calls():
    assert "error-rate" in _ids(_summary(month_to_date_calls=40, month_error_calls=10))
    assert "error-rate" not in _ids(_summary(month_to_date_calls=5, month_error_calls=5))


# ── endpoints ──────────────────────────────────────────────────────────────

class FakeRpc:
    def __init__(self, data=None):
        self.data = data
        self.calls = []

    def rpc(self, name, params):
        self.calls.append((name, params))
        return self

    def execute(self):
        return self


class _User:
    def __init__(self, role, id_=ADMIN_ID):
        self.id = id_
        self.app_metadata = {"role": role}


def _client(role: str, fake: FakeRpc, user_id: str = ADMIN_ID) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api")
    app.dependency_overrides[get_current_user] = lambda: _User(role, user_id)
    app.dependency_overrides[require_admin_supabase] = lambda: fake
    return TestClient(app)


def test_summary_returns_advice_and_suggested_cap():
    fake = FakeRpc(_summary(account_max_calls_per_day=None))

    res = _client("tenant_admin", fake).get("/api/costs/summary")

    assert res.status_code == 200
    body = res.json()
    assert body["suggested_account_cap"] == 666
    assert "no-account-cap" in {a["id"] for a in body["advice"]}


@pytest.mark.parametrize("role", ["sales_exec", "student", "employer"])
def test_other_roles_are_refused(role):
    res = _client(role, FakeRpc(_summary())).get("/api/costs/summary")
    assert res.status_code == 403


def test_settings_saved_with_who_changed_them():
    fake = FakeRpc()

    res = _client("tenant_admin", fake).put("/api/costs/settings", json={
        "account_max_calls_per_day": None, "featurize_max_calls_per_day": 0,
        "evaluate_max_calls_per_day": 50, "price_per_call_inr": 0.05, "monthly_budget_inr": 1000,
    })

    assert res.status_code == 200
    name, params = fake.calls[0]
    assert name == "set_ai_settings"
    assert params["p_updated_by"] == ADMIN_ID
    assert params["p_account_max_calls_per_day"] is None
    assert params["p_featurize_max_calls_per_day"] == 0


def test_settings_refuse_negative_values():
    fake = FakeRpc()
    res = _client("tenant_admin", fake).put("/api/costs/settings", json={"featurize_max_calls_per_day": -1})
    assert res.status_code == 422
    assert fake.calls == []


def test_settings_refuse_sales_exec():
    fake = FakeRpc()
    res = _client("sales_exec", fake).put("/api/costs/settings", json={})
    assert res.status_code == 403
    assert fake.calls == []


def test_settings_refuse_demo_sessions():
    fake = FakeRpc()
    res = _client("admin", fake, user_id="demo-user-id").put("/api/costs/settings", json={})
    assert res.status_code == 403
    assert fake.calls == []
