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
except ImportError:
    class C2C_Orchestrator_V2:
        def __init__(self, candidate_name, audit_gaps):
            self.candidate = candidate_name
            self.gaps = audit_gaps
            self.evidence_scores = {str(gap): 0 for gap in audit_gaps}
            self.logs = []
        def run_ordeal_session(self):
            return {"candidate": self.candidate, "final_status": "CERTIFIED"}

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
    report = {
        "profile_summary": "",
        "actionable_feedback": []
    }

    if founder_profile == "Builder":
        report["profile_summary"] = "Builders thrive on creating and optimizing systems. They combine high cognitive and adversity quotients to solve complex problems."
    elif founder_profile == "Leader":
        report["profile_summary"] = "Leaders excel at rallying teams and building culture. They leverage high emotional and social intelligence."
    elif founder_profile == "Rainmaker":
        report["profile_summary"] = "Rainmakers are natural advocates and relationship builders. They use social and adversity quotients to drive growth."
    elif founder_profile == "Anchor":
        report["profile_summary"] = "Anchors provide stability and process. They combine cognitive and emotional intelligence to manage operations effectively."

    if scores.get("AQ", 0) < 50:
        report["actionable_feedback"].append("Your AQ is below 50. Consider engaging in resilience-building exercises and taking on challenging projects with mentorship.")
    if scores.get("SQ", 0) > 80:
        report["actionable_feedback"].append("Your SQ is high (> 80). Suggest pursuing leadership roles in student clubs or organizing community events.")
    if scores.get("IQ", 0) < 50:
        report["actionable_feedback"].append("Consider supplemental courses or study groups to strengthen core problem-solving (IQ) skills.")
    if scores.get("EQ", 0) > 80:
        report["actionable_feedback"].append("Your EQ is excellent. You might make a great peer mentor or team mediator.")

    # Archetype Engine v2 — SpQ Integration
    if scores.get("SpQ", 0) > 75:
        report["actionable_feedback"].append("Your SpQ is high (> 75). Purpose-driven leadership is a strong growth vector for you. Consider leading cross-functional initiative projects.")
    if scores.get("SpQ", 0) < 40:
        report["actionable_feedback"].append("Your SpQ score is below 40. Engaging in value-alignment reflection and mission-driven projects can help expand your perspective.")

    return report

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

async def run_agent_recruiters(student_id: str):
    logger.info(f"🚀 [WORKER] Running agent-recruiters (Psychologist, Narratologist) for {student_id}...")
    try:
        orch = C2C_Orchestrator_V2(candidate_name=student_id, audit_gaps=[])
        res = orch.run_ordeal_session()
        logger.info(f"✅ [WORKER] agent-recruiters session result: {res}")
    except Exception as e:
        logger.error(f"❌ [WORKER] agent-recruiters failed: {e}")
