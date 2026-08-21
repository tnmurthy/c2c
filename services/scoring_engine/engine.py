"""
Config-driven core scoring engine: founder archetype assignment, weighted
role-fit scoring, and development-report generation.

Extracted from api/routers/assessment/common.py (generate_development_report)
and api/routers/employer_router.py (calculate_match_score) so the 5Q
thresholds and role weights -- the platform's core IP -- can be tuned via
scoring_config.json without touching router code.
"""
import json
import os
from typing import Any, Dict

_CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scoring_config.json")

with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
    _CONFIG = json.load(f)

ARCHETYPE_DIMENSION_MAP: Dict[str, list] = _CONFIG["archetype_dimension_map"]
ARCHETYPE_RULES: Dict[str, Dict[str, Any]] = _CONFIG["archetype_rules"]
FEEDBACK_THRESHOLDS: Dict[str, Dict[str, Any]] = _CONFIG["feedback_thresholds"]
ROLE_WEIGHTS: Dict[str, Dict[str, float]] = _CONFIG["role_weights"]


def compute_founder_fit(scores: Dict[str, Any]) -> Dict[str, float]:
    """Sum of the dimension scores mapped to each founder archetype."""
    return {
        archetype: sum(scores.get(dim, 0) for dim in dims)
        for archetype, dims in ARCHETYPE_DIMENSION_MAP.items()
    }


def compute_archetype(scores: Dict[str, Any]) -> str:
    """Founder archetype with the highest combined dimension score."""
    founder_fit = compute_founder_fit(scores)
    return max(founder_fit, key=founder_fit.get)


def compute_fit_score(student_scores: Dict[str, Any], role_type: str = "tech") -> float:
    """Weighted 5Q match score (0-100) for a given role type."""
    weights = ROLE_WEIGHTS.get(role_type, ROLE_WEIGHTS["tech"])
    max_possible = sum(w * 100 for w in weights.values())
    raw = sum(weights.get(dim, 0) * float(score) for dim, score in student_scores.items())
    return round((raw / max_possible) * 100, 1) if max_possible > 0 else 0.0


def generate_development_report(scores: Dict[str, int], archetype: str) -> Dict[str, Any]:
    """Profile summary + threshold-triggered actionable feedback for a completed assessment."""
    report: Dict[str, Any] = {
        "profile_summary": ARCHETYPE_RULES.get(archetype, {}).get("summary", ""),
        "actionable_feedback": [],
    }

    for dim, thresholds in FEEDBACK_THRESHOLDS.items():
        score = scores.get(dim, 0)
        if "low" in thresholds and score < thresholds["low"]:
            report["actionable_feedback"].append(thresholds["low_feedback"])
        if "high" in thresholds and score > thresholds["high"]:
            report["actionable_feedback"].append(thresholds["high_feedback"])

    return report
