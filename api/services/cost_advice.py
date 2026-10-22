"""
Ways to spend less on AI, worked out from this account's own usage.

Pure functions over the `ai_spend_summary` payload so every rule is unit
tested without a database. Each item says where it is fixed.
"""
import math
from typing import Any, Dict, List, Optional

DAYS_PER_MONTH = 30
# A cap this many times the busiest recent day is unused headroom.
CAP_HEADROOM = 3
# Share of this month's calls that failed before it is worth a look.
ERROR_RATE_WARN = 0.10
MIN_CALLS_FOR_ERROR_RATE = 20

FEATURES = (
    ("featurize", "Candidate profile features", "featurize_max_calls_per_day", "featurize_calls"),
    ("evaluate", "Assessment evaluation", "evaluate_max_calls_per_day", "evaluate_calls"),
    ("match", "Job candidate matching", "match_max_calls_per_day", "match_calls"),
)


def _num(value: Any) -> Optional[float]:
    return None if value is None else float(value)


def cost_inr(calls: int, price: Optional[float]) -> Optional[float]:
    return None if price is None else calls * price


def suggested_account_cap(summary: Dict[str, Any]) -> Optional[int]:
    """Account daily cap that keeps a month inside the budget."""
    price = _num(summary.get("price_per_call_inr"))
    budget = _num(summary.get("monthly_budget_inr"))
    if not price or not budget:
        return None
    return max(math.floor(budget / price / DAYS_PER_MONTH), 1)


def _advice(id_: str, level: str, title: str, detail: str) -> Dict[str, str]:
    return {"id": id_, "level": level, "title": title, "detail": detail}


def build_advice(summary: Dict[str, Any]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    price = _num(summary.get("price_per_call_inr"))
    budget = _num(summary.get("monthly_budget_inr"))

    if summary.get("account_max_calls_per_day") is None:
        out.append(_advice(
            "no-account-cap", "act", "No account-wide daily limit",
            "The per-feature limits add up. One account limit bounds a day's AI spend whatever each feature does.",
        ))

    if price and budget:
        projected = cost_inr(int(summary.get("projected_month_calls") or 0), price) or 0
        if projected > budget:
            cap = suggested_account_cap(summary)
            out.append(_advice(
                "over-budget", "act", "This month is on course to exceed the budget",
                f"Projected ₹{projected:,.0f} against ₹{budget:,.0f}. Lower the account daily limit to {cap} calls.",
            ))
    else:
        out.append(_advice(
            "no-budget", "consider", "No price or budget set",
            "With the price of one TypeSafe call and a monthly budget, this page shows rupees and suggests a daily limit.",
        ))

    today = summary.get("today_calls") or {}
    by_day = summary.get("by_day") or []
    for key, label, cap_field, calls_field in FEATURES:
        cap = summary.get(cap_field)
        used_today = int(today.get(calls_field) or 0)
        busiest = max([int(d.get(calls_field) or 0) for d in by_day] or [0])

        if cap is not None and cap > 0 and used_today >= cap:
            out.append(_advice(
                f"{key}-cap-reached", "consider", f"{label} reached its daily limit today",
                f"{used_today} of {cap} calls used. Further requests today show heuristic estimates; raise the limit if that is not acceptable.",
            ))
        elif cap is not None and cap > 0 and busiest > 0 and cap > busiest * CAP_HEADROOM:
            out.append(_advice(
                f"{key}-headroom", "consider", f"{label} allows {cap} calls a day; the busiest day used {busiest}",
                f"A limit near {busiest * CAP_HEADROOM} still leaves room and bounds a misuse.",
            ))

    calls = int(summary.get("month_to_date_calls") or 0)
    errors = int(summary.get("month_error_calls") or 0)
    if calls >= MIN_CALLS_FOR_ERROR_RATE and errors / calls > ERROR_RATE_WARN:
        out.append(_advice(
            "error-rate", "consider", f"{errors} of {calls} calls this month failed",
            "Failed calls return heuristic estimates. Check the API key and the backend logs for TypeSafe errors.",
        ))

    return out
