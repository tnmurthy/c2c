"""
Database-enforced AI call budget (see migration 20261022000000_typesafe_feature_cache_and_ai_caps.sql).

Every paid model call is claimed in `ai_call_ledger` before it is made. The
database refuses the claim when a daily cap is reached. If the budget check
itself fails, the call is refused (fail closed): an unreachable ledger must
never mean unmetered spend.
"""
import logging
from typing import Optional

from api.db import get_service_client

logger = logging.getLogger("c2c_api.ai_budget")


class BudgetRefused(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def claim_ai_call(source: str, student_id: Optional[str] = None) -> int:
    """Returns the ledger id for the claimed call, or raises BudgetRefused."""
    try:
        res = get_service_client().rpc(
            "claim_ai_call", {"p_source": source, "p_student_id": student_id}
        ).execute()
        result = res.data or {}
    except Exception as e:
        logger.error("AI budget check unavailable, refusing %s call: %s", source, e)
        raise BudgetRefused("budget_check_unavailable") from e

    if not result.get("allowed"):
        raise BudgetRefused(result.get("reason") or "refused")
    return int(result["ledger_id"])


def finish_ai_call(ledger_id: int, ok: bool) -> None:
    try:
        get_service_client().rpc(
            "finish_ai_call", {"p_ledger_id": ledger_id, "p_outcome": "ok" if ok else "error"}
        ).execute()
    except Exception as e:
        # The call is already counted as claimed; only the outcome label is lost.
        logger.warning("Could not record outcome for AI ledger row %s: %s", ledger_id, e)
