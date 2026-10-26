"""
AI call budget for Gemini, enforced by the c2c database (claim_ai_call).

Each billable Gemini request is claimed in ai_call_ledger before it is sent.
The database refuses it at the daily cap. Without SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY, or if the check fails, the call is refused:
unmetered spend is never the fallback.
"""
import os
from typing import Optional

import requests

TIMEOUT_SECONDS = 10


class BudgetRefused(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def _rpc(name: str, params: dict):
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise BudgetRefused("budget_not_configured")
    resp = requests.post(
        f"{url.rstrip('/')}/rest/v1/rpc/{name}",
        json=params,
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        timeout=TIMEOUT_SECONDS,
    )
    resp.raise_for_status()
    return resp.json() if resp.content else None


def claim(source: str, student_id: Optional[str] = None) -> int:
    """Returns the ledger id for one Gemini call, or raises BudgetRefused."""
    try:
        result = _rpc("claim_ai_call", {"p_source": source, "p_student_id": student_id}) or {}
    except BudgetRefused:
        raise
    except Exception as e:
        raise BudgetRefused(f"budget_check_unavailable: {e}") from e
    if not result.get("allowed"):
        raise BudgetRefused(result.get("reason") or "refused")
    return int(result["ledger_id"])


def finish(ledger_id: int, ok: bool) -> None:
    try:
        _rpc("finish_ai_call", {"p_ledger_id": ledger_id, "p_outcome": "ok" if ok else "error"})
    except Exception as e:
        # The call is already counted; only its outcome label is lost.
        print(f"[AI] Could not record outcome for ledger row {ledger_id}: {e}")
