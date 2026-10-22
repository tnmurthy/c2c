"""
Keyword / Likert heuristics used when the TypeSafe System One API is unavailable.

These are NOT model judgments. Every response built here is labelled with
HEURISTIC_PROVIDER and is_live_api=False so the UI never presents it as TypeSafe output.
"""
import math
from datetime import datetime, timezone
from typing import Any, Dict, List

from api.schemas.typesafe import (
    DimensionScore,
    FounderArchetype,
    TypeSafeEvaluateResponse,
    TypeSafeFeatureColumn,
    TypeSafeFeaturizeResponse,
)

HEURISTIC_PROVIDER = "Heuristic estimate (TypeSafe unavailable)"
HEURISTIC_CONFIDENCE = 0.5
LIKERT_MAX = 5.0
DIMENSIONS = ["IQ", "EQ", "AQ", "SQ", "SpQ"]

KEYWORDS = {
    "production_engineering": ["docker", "ci/cd", "kubernetes", "test", "testing", "pytest", "jest", "monitoring", "deploy"],
    "systems_architecture": ["microservices", "cache", "redis", "database", "postgres", "sql", "architecture", "scalability", "api"],
    "problem_solving_rigor": ["algorithm", "optimization", "bottleneck", "latency", "distributed", "concurrency", "performance"],
    "leadership_ownership": ["lead", "led", "mentored", "coordinated", "designed", "owned", "spearheaded", "founded"],
    "concurrency_experience": ["async", "threading", "queue", "kafka", "rabbitmq", "celery", "concurrent", "parallel"],
    "startup_agility": ["startup", "0 to 1", "hackathon", "mvp", "prototype", "fast-paced", "pivot", "scrappy"],
    "cross_functional_alignment": ["product manager", "designer", "stakeholders", "clients", "cross-functional", "collaborated"],
}


def percentile_band(score: float) -> str:
    return "Top 10%" if score >= 85 else "Top 25%" if score >= 70 else "Average"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _mean_and_sd(probs: List[float]) -> tuple:
    mean = sum(i * p for i, p in enumerate(probs))
    variance = max(0.0, sum((i ** 2) * p for i, p in enumerate(probs)) - mean ** 2)
    return mean, math.sqrt(variance)


def evaluate_heuristic(responses: List[Dict[str, Any]], candidate_name: str) -> TypeSafeEvaluateResponse:
    """Averages Likert responses per dimension. Dimensions with no responses are omitted, never invented."""
    totals = {d: 0.0 for d in DIMENSIONS}
    counts = {d: 0 for d in DIMENSIONS}
    for r in responses:
        dim = r.get("dimension") or r.get("primary_dimension")
        if dim not in totals:
            continue
        try:
            value = float(r.get("response") if r.get("response") is not None else r.get("value"))
        except (TypeError, ValueError):
            continue
        totals[dim] += value
        counts[dim] += 1

    scores: Dict[str, DimensionScore] = {}
    for dim in DIMENSIONS:
        if counts[dim] == 0:
            continue
        normalized = min(100.0, max(0.0, totals[dim] / (counts[dim] * LIKERT_MAX) * 100.0))
        scores[dim] = DimensionScore(
            score=round(normalized, 1),
            percentile_band=percentile_band(normalized),
            confidence=HEURISTIC_CONFIDENCE,
            rationale=f"Heuristic Likert average over {counts[dim]} response(s); not a model judgment.",
        )
    if not scores:
        raise ValueError("No scorable assessment responses (each needs a 5Q dimension and a numeric response).")

    s = {d: scores[d].score if d in scores else 0.0 for d in DIMENSIONS}
    weights = {
        "Builder": s["IQ"] + s["AQ"],
        "Leader": s["EQ"] + s["SQ"],
        "Rainmaker": s["SQ"] + s["AQ"],
        "Anchor": s["IQ"] + s["EQ"],
    }
    total = sum(weights.values()) or 1.0
    primary = max(weights, key=weights.get)

    return TypeSafeEvaluateResponse(
        candidate_name=candidate_name,
        primary_archetype=FounderArchetype(primary),
        archetype_probabilities={k: round(v / total, 3) for k, v in weights.items()},
        scores=scores,
        placement_ready=s["AQ"] >= 60 and s["IQ"] >= 60,
        requires_intervention=("AQ" in scores and s["AQ"] < 45) or ("EQ" in scores and s["EQ"] < 40),
        ai_confidence=HEURISTIC_CONFIDENCE,
        model_provider=HEURISTIC_PROVIDER,
        is_live_api=False,
        timestamp=_now(),
    )


def featurize_heuristic(free_text: str, candidate_name: str, probes: List[Dict[str, str]]) -> TypeSafeFeaturizeResponse:
    text_lower = free_text.lower()
    features: Dict[str, TypeSafeFeatureColumn] = {}
    vector: List[float] = []
    names: List[str] = []

    for p in probes:
        name = p["name"]
        hits = sum(1 for kw in KEYWORDS.get(name, [name.replace("_", " ")]) if kw in text_lower)
        if p["kind"] == "intensity":
            if hits >= 4:
                probs = [0.05, 0.10, 0.20, 0.40, 0.25]
            elif hits >= 2:
                probs = [0.10, 0.20, 0.45, 0.20, 0.05]
            elif hits == 1:
                probs = [0.20, 0.40, 0.30, 0.08, 0.02]
            else:
                probs = [0.60, 0.25, 0.10, 0.04, 0.01]
            mean, sd = _mean_and_sd(probs)
            features[name] = TypeSafeFeatureColumn(
                name=name, kind="intensity", mean=round(mean, 2), spread_sd=round(sd, 2),
                interpretation=f"Keyword estimate: {mean:.2f}/4.0 ({hits} keyword hit(s)).",
            )
            names.extend([name, f"{name}_sd"])
            vector.extend([round(mean, 2), round(sd, 2)])
        else:
            prob = 0.85 if hits else 0.15
            features[name] = TypeSafeFeatureColumn(
                name=name, kind="presence", mean=prob, spread_sd=0.0,
                interpretation=f"Keyword estimate: {'keywords found' if hits else 'no keywords found'}.",
            )
            names.append(name)
            vector.append(prob)

    return TypeSafeFeaturizeResponse(
        candidate_name=candidate_name,
        features=features,
        numeric_vector=vector,
        feature_names=names,
        model_provider=HEURISTIC_PROVIDER,
        is_live_api=False,
        timestamp=_now(),
    )
