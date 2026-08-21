"""
Shared helpers, background tasks, and the C2C_Orchestrator_V2 fallback used
across the assessment sub-routers (bank, sessions, scoring, feedback, admin,
webhooks).
"""
import os
import re
import logging
from typing import Dict, Any

logger = logging.getLogger("c2c_api.assessment")

# Try to import C2C_Orchestrator_V2
# (this module lives at api/routers/assessment/common.py, so go up 4 levels to reach the project root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
try:
    from scripts.c2c_orchestrator_v2 import C2C_Orchestrator_V2
    ORCHESTRATOR_IMPORT_ERROR: str | None = None
except ImportError as e:
    C2C_Orchestrator_V2 = None
    ORCHESTRATOR_IMPORT_ERROR = str(e)
    logger.critical(
        f"CRITICAL: C2C_Orchestrator_V2 failed to import: {e}. "
        "Agent evaluation will be DISABLED until this is resolved."
    )

# --- HELPERS ---

def parse_scoring_logic(logic_str: str, item_type: str) -> Dict[str, Any]:
    if not logic_str or not isinstance(logic_str, str):
        return {}

    logic = {}
    item_type_lower = item_type.lower()
    if "sjt" in item_type_lower:
        matches = re.findall(r'([A-E]):\s*(\d+)', logic_str)
        if matches:
            logic["mapping"] = {k: int(v) for k, v in matches}
    elif "likert" in item_type_lower:
        if "high score = high" in logic_str.lower():
            logic["direction"] = "forward"
        elif "low score = high" in logic_str.lower() or "reverse" in logic_str.lower():
            logic["direction"] = "reverse"
        else:
            logic["direction"] = "forward"
    elif "cognitive" in item_type_lower:
        match = re.search(r'Correct:\s*([A-E]|\d+)', logic_str, re.I)
        if match:
            logic["correct_answer"] = match.group(1)

    return logic

def generate_development_report(scores: Dict[str, int], founder_profile: str) -> Dict[str, Any]:
    """Thin re-export: thresholds and archetype summaries now live in
    services/scoring_engine/scoring_config.json, editable without touching
    router code. Kept here so existing imports don't need to change."""
    from services.scoring_engine.engine import generate_development_report as _generate_development_report
    return _generate_development_report(scores, founder_profile)

def normalize_bank_item(item: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(item)
    if "ID" in normalized and "id" not in normalized:
        normalized["id"] = normalized["ID"]
    if "type" in normalized and "item_type" not in normalized:
        normalized["item_type"] = normalized["type"]
    sl = normalized.get("scoring_logic")
    if isinstance(sl, str):
        normalized["scoring_logic"] = {"raw": sl}
    return normalized

def get_fallback_bank_path() -> str:
    """Path to fallback_bank.json, relative to the api/routers directory (two levels up from here)."""
    return os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "fallback_bank.json")

# --- BACKGROUND TASKS ---

def _build_agent_profile_summary(final_status: str, evidence_scores: Dict[str, Any]) -> str:
    """finalize_session() reports convergence but no narrative summary -- derive one
    from the per-gap evidence scores so development_reports.profile_summary isn't blank."""
    if not evidence_scores:
        return f"Ordeal session completed with status: {final_status}."
    strongest = max(evidence_scores, key=evidence_scores.get)
    weakest = min(evidence_scores, key=evidence_scores.get)
    return (
        f"Ordeal session result: {final_status}. "
        f"Strongest demonstrated gap: {strongest} ({evidence_scores[strongest]}). "
        f"Weakest demonstrated gap: {weakest} ({evidence_scores[weakest]})."
    )


async def run_agent_recruiters(student_id: str):
    if C2C_Orchestrator_V2 is None:
        logger.error(f"[WORKER] Skipping agent-recruiters for {student_id} — orchestrator unavailable ({ORCHESTRATOR_IMPORT_ERROR})")
        return
    logger.info(f"🚀 [WORKER] Running agent-recruiters (Psychologist, Narratologist) for {student_id}...")
    try:
        orch = C2C_Orchestrator_V2(candidate_name=student_id, audit_gaps=[])
        res = orch.run_ordeal_session()
        logger.info(f"✅ [WORKER] agent-recruiters session result: {res}")
    except Exception as e:
        logger.error(f"❌ [WORKER] agent-recruiters failed: {e}")
        return

    try:
        from api.deps import require_admin_supabase
        client = require_admin_supabase()
        final_status = res.get("final_status", "UNKNOWN")
        evidence_scores = res.get("evidence_scores", {})
        client.table("development_reports").insert({
            "student_id": student_id,
            "ordeal_status": final_status,
            "evidence_scores": evidence_scores,
            "profile_summary": _build_agent_profile_summary(final_status, evidence_scores),
            "actionable_feedback": [],
        }).execute()
        logger.info(f"✅ [WORKER] Persisted development_reports row for {student_id}")
    except Exception as e:
        logger.error(f"❌ [WORKER] Failed to persist development_reports for {student_id}: {e}")
