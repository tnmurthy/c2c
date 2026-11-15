"""5Q scoring: raw item scoring, normalisation, bands, founder fit, report.

Pure functions — no database, no FastAPI. Moved unchanged in behaviour from
api/routers/assessment_router.py (R1 refactor).
"""
import logging
import re
from typing import Any, Dict, List, Mapping

logger = logging.getLogger("c2c_api.assessment")

DIMENSIONS: List[str] = ["IQ", "EQ", "SQ", "AQ", "SpQ"]


def parse_scoring_logic(logic_str: str, item_type: str) -> Dict[str, Any]:
    if not logic_str or not isinstance(logic_str, str):
        return {}

    logic: Dict[str, Any] = {}
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


def _logic_str(item: Mapping[str, Any]) -> str:
    logic_raw = item.get("scoring_logic")
    return logic_raw.get("raw", "") if isinstance(logic_raw, dict) else str(logic_raw or "")


def raw_scores(responses: List[Dict[str, Any]], items_map: Mapping[Any, Dict[str, Any]]) -> Dict[str, int]:
    """Sum each response's score into its item's primary dimension."""
    scores = {dim: 0 for dim in DIMENSIONS}
    for resp in responses:
        item = items_map.get(resp["item_id"])
        if not item:
            continue
        val, dim = resp["response"], item["primary_dimension"]
        try:
            logic = parse_scoring_logic(_logic_str(item), item["item_type"])
            if item["item_type"].lower() == "likert":
                s = int(val)
                if logic.get("direction") == "reverse":
                    s = 6 - s
                scores[dim] += s
            elif item["item_type"].lower() == "cognitive":
                if str(val) == str(logic.get("correct_answer")):
                    scores[dim] += 1
            elif "sjt" in item["item_type"].lower():
                m = logic.get("mapping") or {}
                if val in m:
                    scores[dim] += m[val]
        except Exception as e:
            logger.warning(f"Failed parsing scoring logic for item {resp['item_id']}: {e}")
    return scores


def max_possible_scores(items_map: Mapping[Any, Dict[str, Any]]) -> Dict[str, int]:
    """Maximum achievable score per dimension for the items in this submission."""
    max_possible = {dim: 0 for dim in DIMENSIONS}
    for item in items_map.values():
        dim = item.get("primary_dimension")
        if dim not in max_possible:
            continue
        item_type_lower = item.get("item_type", "").lower()
        try:
            logic = parse_scoring_logic(_logic_str(item), item.get("item_type", ""))
            if item_type_lower == "likert":
                max_possible[dim] += 5
            elif item_type_lower == "cognitive":
                max_possible[dim] += 1
            elif "sjt" in item_type_lower:
                m = logic.get("mapping") or {}
                max_possible[dim] += max(m.values()) if m else 5
        except Exception as e:
            logger.warning(f"Error calculating max possible for item {item.get('id')}: {e}")
    return max_possible


def normalize_scores(scores: Mapping[str, int], max_possible: Mapping[str, int]) -> Dict[str, int]:
    """Scale to 0–100. Keeps the raw score when no items matched (manual tests)."""
    normalized: Dict[str, int] = {}
    for dim in DIMENSIONS:
        raw_s = scores.get(dim, 0)
        max_s = max_possible.get(dim, 0)
        normalized[dim] = round((raw_s / max_s) * 100) if max_s > 0 else raw_s
    return normalized


def percentile_bands(normalized_scores: Mapping[str, int]) -> Dict[str, str]:
    bands: Dict[str, str] = {}
    for dim, score in normalized_scores.items():
        if dim == "IQ":
            if score >= 90: bands[dim] = "Top 10%"
            elif score >= 80: bands[dim] = "Top 25%"
            elif score >= 60: bands[dim] = "Top 50%"
            else: bands[dim] = "Average"
        elif dim in ["EQ", "SQ", "AQ", "SpQ"]:
            if score >= 85: bands[dim] = "Top 10%"
            elif score >= 75: bands[dim] = "Top 25%"
            elif score >= 55: bands[dim] = "Top 50%"
            else: bands[dim] = "Average"
        else:
            bands[dim] = "Average"
    return bands


def founder_fit(normalized_scores: Mapping[str, int]) -> Dict[str, int]:
    return {
        "Builder": normalized_scores.get("IQ", 0) + normalized_scores.get("AQ", 0),
        "Leader": normalized_scores.get("EQ", 0) + normalized_scores.get("SQ", 0),
        "Rainmaker": normalized_scores.get("SQ", 0) + normalized_scores.get("AQ", 0),
        "Anchor": normalized_scores.get("IQ", 0) + normalized_scores.get("EQ", 0),
    }


def primary_profile(fit: Mapping[str, int]) -> str:
    return max(fit, key=fit.get)


def generate_development_report(scores: Dict[str, int], founder_profile: str) -> Dict[str, Any]:
    report: Dict[str, Any] = {"profile_summary": "", "actionable_feedback": []}

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


def evaluate(responses: List[Dict[str, Any]], items_map: Mapping[Any, Dict[str, Any]]) -> Dict[str, Any]:
    """Full 5Q evaluation of one submission. Returns the fields the API stores and returns."""
    normalized = normalize_scores(raw_scores(responses, items_map), max_possible_scores(items_map))
    bands = percentile_bands(normalized)
    fit = founder_fit(normalized)
    profile = primary_profile(fit)
    report = generate_development_report(normalized, profile)
    report["percentile_bands"] = bands
    return {
        "dimension_scores": normalized,
        "percentile_bands": bands,
        "founder_fit": fit,
        "primary_profile": profile,
        "development_report": report,
    }
