"""
Admin Costs page API: AI spend, the limits on it, and advice to spend less.
Limits are enforced in the database (claim_ai_call); this router only reads and sets them.
"""
import logging
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.deps import require_admin_supabase, require_role
from api.services.cost_advice import build_advice, suggested_account_cap

logger = logging.getLogger("c2c_api.costs")

router = APIRouter(prefix="/costs", tags=["Costs"])

COST_ROLES = ["tenant_admin"]  # admin passes require_role's bypass
SUMMARY_DAYS = 30


class AiSettingsUpdate(BaseModel):
    """null = uncapped (caps) or not set (price, budget). 0 on a feature cap switches it off."""
    account_max_calls_per_day: Optional[int] = Field(None, ge=0, le=1_000_000)
    featurize_max_calls_per_day: Optional[int] = Field(None, ge=0, le=1_000_000)
    evaluate_max_calls_per_day: Optional[int] = Field(None, ge=0, le=1_000_000)
    match_max_calls_per_day: Optional[int] = Field(None, ge=0, le=1_000_000)
    price_per_call_inr: Optional[float] = Field(None, ge=0, le=100_000)
    monthly_budget_inr: Optional[float] = Field(None, ge=0, le=100_000_000)


def _real_user_id(user: Any) -> str:
    """Demo/dev sessions are not real accounts and must not change spend limits."""
    user_id = str(getattr(user, "id", "") or "")
    try:
        uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=403, detail="Sign in with a real admin account to change AI limits.")
    return user_id


@router.get("/summary")
def get_cost_summary(
    user=Depends(require_role(COST_ROLES)), supabase=Depends(require_admin_supabase)
) -> Dict[str, Any]:
    try:
        summary = supabase.rpc("ai_spend_summary", {"p_days": SUMMARY_DAYS}).execute().data
    except Exception as e:
        logger.error("ai_spend_summary failed: %s", e)
        raise HTTPException(status_code=503, detail="AI spend summary is unavailable.")
    if not summary:
        raise HTTPException(status_code=503, detail="AI cost settings are not initialised.")
    return {
        **summary,
        "suggested_account_cap": suggested_account_cap(summary),
        "advice": build_advice(summary),
    }


@router.put("/settings")
def update_cost_settings(
    payload: AiSettingsUpdate,
    user=Depends(require_role(COST_ROLES)),
    supabase=Depends(require_admin_supabase),
) -> Dict[str, Any]:
    user_id = _real_user_id(user)
    try:
        supabase.rpc("set_ai_settings", {
            "p_account_max_calls_per_day": payload.account_max_calls_per_day,
            "p_featurize_max_calls_per_day": payload.featurize_max_calls_per_day,
            "p_evaluate_max_calls_per_day": payload.evaluate_max_calls_per_day,
            "p_match_max_calls_per_day": payload.match_max_calls_per_day,
            "p_price_per_call_inr": payload.price_per_call_inr,
            "p_monthly_budget_inr": payload.monthly_budget_inr,
            "p_updated_by": user_id,
        }).execute()
    except Exception as e:
        logger.error("set_ai_settings failed: %s", e)
        raise HTTPException(status_code=503, detail="Could not save AI limits.")
    logger.info("AI limits changed by %s: %s", user_id, payload.model_dump())
    return {"saved": True}
