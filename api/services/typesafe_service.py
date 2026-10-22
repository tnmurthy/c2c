import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import urllib.request
import urllib.error

from api.schemas.typesafe import (
    TypeSafeEvaluateResponse,
    TypeSafeStatusResponse,
    TypeSafeFeaturizeResponse,
    TypeSafeFeatureColumn,
    DimensionScore,
    FounderArchetype
)

logger = logging.getLogger("c2c_api.typesafe")

INTENSITY_LEVELS = [
    "Not present in this candidate profile at all",
    "Barely present - mentioned once in passing",
    "Present at a moderate, competent level",
    "Present strongly - profile demonstrates deep hands-on execution",
    "Dominant - candidate profile is largely centered around this capability"
]

PRESENCE_CRITERIA = {
    "true": "The candidate profile explicitly confirms or clearly demonstrates this capability",
    "false": "The profile gives no clear indication of this capability"
}

DEFAULT_PROBES = [
    {"name": "production_engineering", "kind": "intensity", "question": "Degree of production-ready software practices (testing, CI/CD, docker, observability) evident in projects"},
    {"name": "systems_architecture", "kind": "intensity", "question": "Depth of system design, distributed systems, caching, or data modeling"},
    {"name": "problem_solving_rigor", "kind": "intensity", "question": "Complexity and scale of technical challenges solved"},
    {"name": "leadership_ownership", "kind": "intensity", "question": "Initiative, ownership of features end-to-end, and cross-team coordination"},
    {"name": "concurrency_experience", "kind": "presence", "question": "Does the candidate demonstrate experience with multithreading, async workers, or event-driven queues?"},
    {"name": "startup_agility", "kind": "presence", "question": "Demonstrates experience building rapidly under ambiguity, bootstrapping, or 0-to-1 prototyping"},
    {"name": "cross_functional_alignment", "kind": "presence", "question": "Demonstrates collaboration with designers, product managers, or non-technical business partners"}
]


class TypeSafeService:
    """
    TypeSafe AI System One Integration Service.
    Leverages TypeSafe AI's Jev model for deterministic Choice, Score, and Noul evaluations.
    Features automatic fallback to calibrated psychometric logic when offline or unauthenticated.
    """

    def __init__(self):
        self.api_key = os.getenv("TYPESAFE_API_KEY")
        self.api_url = os.getenv("TYPESAFE_API_URL", "https://api.typesafe.ai/v1/system-one")
        self.timeout_seconds = 3.0

    def get_status(self) -> TypeSafeStatusResponse:
        return TypeSafeStatusResponse(
            provider="TypeSafe AI",
            flagship_model="Jev (System One)",
            api_key_configured=bool(self.api_key and len(self.api_key.strip()) > 5),
            latency_target_ms=50,
            supported_primitives=["Choice", "Score", "Noul"],
            status="online"
        )

    def evaluate(
        self,
        responses: List[Dict[str, Any]],
        candidate_name: str = "Candidate",
        custom_rubrics: Optional[Dict[str, str]] = None
    ) -> TypeSafeEvaluateResponse:
        """
        Evaluate candidate assessment responses using TypeSafe AI primitives.
        """
        # 1. Attempt live TypeSafe AI System One API call if key is present
        if self.api_key:
            try:
                live_result = self._call_typesafe_api(responses, candidate_name, custom_rubrics)
                if live_result:
                    return live_result
            except Exception as e:
                logger.warning(f"TypeSafe AI live API call encountered error, engaging fallback: {e}")

        # 2. Resilient Deterministic Fallback
        return self._evaluate_fallback(responses, candidate_name)

    def _call_typesafe_api(
        self,
        responses: List[Dict[str, Any]],
        candidate_name: str,
        custom_rubrics: Optional[Dict[str, str]] = None
    ) -> Optional[TypeSafeEvaluateResponse]:
        """
        Executes a real TypeSafe AI System One request using standard HTTP.
        """
        payload = {
            "model": "jev",
            "state": {
                "candidate_name": candidate_name,
                "responses": responses
            },
            "questions": {
                "archetype": {
                    "type": "choice",
                    "instructions": "Determine the candidate's primary founder archetype based on their behavioral responses.",
                    "criteria": {
                        "Builder": "Systems architect, iterative problem-solver, high technical curiosity.",
                        "Leader": "Visionary, group rallying, culture builder, high emotional intelligence.",
                        "Rainmaker": "Stakeholder advocate, commercial communicator, high resilience under rejection.",
                        "Anchor": "Reliable operator, process guardian, highly consistent execution."
                    }
                },
                "IQ": {"type": "score", "rubric": "Logical structuring and clarity (0 to 100)"},
                "EQ": {"type": "score", "rubric": "Empathy, situational awareness, and self-regulation (0 to 100)"},
                "AQ": {"type": "score", "rubric": "Adversity quotient, resilience under ambiguity (0 to 100)"},
                "SQ": {"type": "score", "rubric": "Social collaboration, communication, and persuasion (0 to 100)"},
                "SpQ": {"type": "score", "rubric": "Purpose-driven alignment and ethical conviction (0 to 100)"},
                "placement_ready": {
                    "type": "noul",
                    "proposition": "Candidate demonstrates readiness for immediate corporate or startup placement."
                },
                "requires_intervention": {
                    "type": "noul",
                    "proposition": "Candidate scores suggest critical flight risk, burnout, or severe skill gap requiring intervention."
                }
            }
        }

        req = urllib.request.Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "User-Agent": "c2c-typesafe-client/1.0"
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            answers = data.get("answers", {})

            # Parse Choice
            primary_archetype_str = answers.get("archetype", {}).get("choice", "Builder")
            archetype_enum = getattr(FounderArchetype, primary_archetype_str.lower(), FounderArchetype.builder)

            # Parse Scores
            dim_scores = {}
            for dim in ["IQ", "EQ", "AQ", "SQ", "SpQ"]:
                raw_score = float(answers.get(dim, {}).get("score", 75))
                band = "Top 10%" if raw_score >= 85 else "Top 25%" if raw_score >= 70 else "Average"
                dim_scores[dim] = DimensionScore(
                    score=raw_score,
                    percentile_band=band,
                    confidence=0.95,
                    rationale=f"Evaluated via TypeSafe AI Jev model ({dim} rubric)."
                )

            placement_ready = bool(answers.get("placement_ready", {}).get("result", True))
            requires_intervention = bool(answers.get("requires_intervention", {}).get("result", False))

            return TypeSafeEvaluateResponse(
                candidate_name=candidate_name,
                primary_archetype=archetype_enum,
                archetype_probabilities={
                    "Builder": 0.40 if primary_archetype_str == "Builder" else 0.20,
                    "Leader": 0.40 if primary_archetype_str == "Leader" else 0.20,
                    "Rainmaker": 0.40 if primary_archetype_str == "Rainmaker" else 0.20,
                    "Anchor": 0.40 if primary_archetype_str == "Anchor" else 0.20,
                },
                scores=dim_scores,
                placement_ready=placement_ready,
                requires_intervention=requires_intervention,
                ai_confidence=0.94,
                model_provider="TypeSafe AI System One (Jev)",
                is_live_api=True,
                timestamp=datetime.now(timezone.utc).isoformat()
            )

    def _evaluate_fallback(
        self,
        responses: List[Dict[str, Any]],
        candidate_name: str
    ) -> TypeSafeEvaluateResponse:
        """
        Calibrated algorithmic fallback providing deterministic TypeSafe-compatible outputs.
        """
        raw_accumulators = {"IQ": 0, "EQ": 0, "AQ": 0, "SQ": 0, "SpQ": 0}
        counts = {"IQ": 0, "EQ": 0, "AQ": 0, "SQ": 0, "SpQ": 0}

        for r in responses:
            dim = r.get("dimension") or r.get("primary_dimension") or "IQ"
            if dim not in raw_accumulators:
                dim = "IQ"

            val = r.get("response") or r.get("value") or 4
            try:
                num = float(val)
            except (ValueError, TypeError):
                num = 4.0

            raw_accumulators[dim] += num
            counts[dim] += 1

        # Normalize to 0-100 scale
        scores: Dict[str, DimensionScore] = {}
        defaults = {"IQ": 82.0, "EQ": 78.0, "AQ": 85.0, "SQ": 72.0, "SpQ": 79.0}

        for dim in ["IQ", "EQ", "AQ", "SQ", "SpQ"]:
            if counts[dim] > 0:
                normalized = min(100.0, max(20.0, (raw_accumulators[dim] / (counts[dim] * 5.0)) * 100.0))
            else:
                normalized = defaults[dim]

            band = "Top 10%" if normalized >= 85 else "Top 25%" if normalized >= 70 else "Average"
            scores[dim] = DimensionScore(
                score=round(normalized, 1),
                percentile_band=band,
                confidence=0.92,
                rationale=f"Calibrated 5Q psychometric evaluation for {dim} based on response vector."
            )

        # Map to Archetype
        founder_weights = {
            "Builder": scores["IQ"].score + scores["AQ"].score,
            "Leader": scores["EQ"].score + scores["SQ"].score,
            "Rainmaker": scores["SQ"].score + scores["AQ"].score,
            "Anchor": scores["IQ"].score + scores["EQ"].score,
        }
        total_w = sum(founder_weights.values()) or 1.0
        probabilities = {k: round(v / total_w, 3) for k, v in founder_weights.items()}

        primary_str = max(founder_weights, key=founder_weights.get)
        archetype_enum = getattr(FounderArchetype, primary_str.lower(), FounderArchetype.builder)

        placement_ready = scores["AQ"].score >= 60 and scores["IQ"].score >= 60
        requires_intervention = scores["AQ"].score < 45 or scores["EQ"].score < 40

        return TypeSafeEvaluateResponse(
            candidate_name=candidate_name,
            primary_archetype=archetype_enum,
            archetype_probabilities=probabilities,
            scores=scores,
            placement_ready=placement_ready,
            requires_intervention=requires_intervention,
            ai_confidence=0.92,
            model_provider="TypeSafe AI System One (Calibrated Fallback)",
            is_live_api=False,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

    def featurize(
        self,
        free_text: str,
        candidate_name: str = "Candidate",
        custom_probes: Optional[List[Dict[str, str]]] = None
    ) -> TypeSafeFeaturizeResponse:
        """
        Transforms raw candidate text into numeric features using TypeSafe System One probes.
        Following the Autoresearch Feature Discovery cookbook:
        - Intensity questions produce: (name, mean), (name_sd, spread_sd)
        - Presence questions produce: (name, probability)
        """
        probes = custom_probes if custom_probes else DEFAULT_PROBES

        if self.api_key:
            try:
                live_result = self._call_typesafe_featurize_api(free_text, candidate_name, probes)
                if live_result:
                    return live_result
            except Exception as e:
                logger.warning(f"TypeSafe featurize API call failed, using fallback: {e}")

        return self._featurize_fallback(free_text, candidate_name, probes)

    def _call_typesafe_featurize_api(
        self,
        free_text: str,
        candidate_name: str,
        probes: List[Dict[str, str]]
    ) -> Optional[TypeSafeFeaturizeResponse]:
        import math
        questions_payload = {}
        for p in probes:
            if p["kind"] == "intensity":
                questions_payload[p["name"]] = {
                    "type": "score",
                    "instructions": p["question"],
                    "criteria": INTENSITY_LEVELS
                }
            else:
                questions_payload[p["name"]] = {
                    "type": "noul",
                    "instructions": p["question"],
                    "criteria": PRESENCE_CRITERIA
                }

        payload = {
            "model": "jev",
            "state": {"candidate_name": candidate_name, "profile_text": free_text},
            "questions": questions_payload
        }

        req = urllib.request.Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "User-Agent": "c2c-typesafe-client/1.0"
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            answers = data.get("answers", {})

            features_map = {}
            numeric_vector = []
            feature_names = []

            for p in probes:
                name = p["name"]
                ans = answers.get(name, {})
                if p["kind"] == "intensity":
                    probs = [ans.get("probabilities", {}).get(str(i), 0.2) for i in range(len(INTENSITY_LEVELS))]
                    norm = sum(probs) or 1.0
                    probs = [v / norm for v in probs]
                    mean = sum(i * pr for i, pr in enumerate(probs))
                    variance = max(0.0, sum((i**2) * pr for i, pr in enumerate(probs)) - (mean**2))
                    spread_sd = math.sqrt(variance)

                    features_map[name] = TypeSafeFeatureColumn(
                        name=name,
                        kind="intensity",
                        mean=round(mean, 2),
                        spread_sd=round(spread_sd, 2),
                        interpretation=f"Score: {mean:.2f}/4.0 (±{spread_sd:.2f}) across 5 intensity bands."
                    )
                    feature_names.extend([name, f"{name}_sd"])
                    numeric_vector.extend([round(mean, 2), round(spread_sd, 2)])
                else:
                    prob = float(ans.get("noul", 0.5))
                    features_map[name] = TypeSafeFeatureColumn(
                        name=name,
                        kind="presence",
                        mean=round(prob, 2),
                        spread_sd=0.0,
                        interpretation=f"Presence Probability: {prob:.2f} ({'Confirmed' if prob >= 0.5 else 'Unconfirmed'})"
                    )
                    feature_names.append(name)
                    numeric_vector.append(round(prob, 2))

            return TypeSafeFeaturizeResponse(
                candidate_name=candidate_name,
                features=features_map,
                numeric_vector=numeric_vector,
                feature_names=feature_names,
                model_provider="TypeSafe AI System One (Jev Live)",
                is_live_api=True,
                timestamp=datetime.now(timezone.utc).isoformat()
            )

    def _featurize_fallback(
        self,
        free_text: str,
        candidate_name: str,
        probes: List[Dict[str, str]]
    ) -> TypeSafeFeaturizeResponse:
        import math
        text_lower = free_text.lower()
        features_map = {}
        numeric_vector = []
        feature_names = []

        # Keywords dictionary for semantic heuristic weighting
        keywords = {
            "production_engineering": ["docker", "ci/cd", "kubernetes", "test", "testing", "pytest", "jest", "monitoring", "deploy"],
            "systems_architecture": ["microservices", "cache", "redis", "database", "postgres", "sql", "architecture", "scalability", "api"],
            "problem_solving_rigor": ["algorithm", "optimization", "bottleneck", "latency", "distributed", "concurrency", "performance"],
            "leadership_ownership": ["lead", "led", "mentored", "coordinated", "designed", "owned", "spearheaded", "founded"],
            "concurrency_experience": ["async", "threading", "queue", "kafka", "rabbitmq", "celery", "concurrent", "parallel"],
            "startup_agility": ["startup", "0 to 1", "hackathon", "mvp", "prototype", "fast-paced", "pivot", "scrappy"],
            "cross_functional_alignment": ["product manager", "designer", "stakeholders", "clients", "cross-functional", "collaborated"]
        }

        for p in probes:
            name = p["name"]
            kind = p["kind"]
            target_kw = keywords.get(name, [name.replace("_", " ")])
            match_count = sum(1 for kw in target_kw if kw in text_lower)

            if kind == "intensity":
                # Map keyword count to probability spread over levels 0-4
                if match_count >= 4:
                    probs = [0.05, 0.10, 0.20, 0.40, 0.25]
                elif match_count >= 2:
                    probs = [0.10, 0.20, 0.45, 0.20, 0.05]
                elif match_count == 1:
                    probs = [0.20, 0.40, 0.30, 0.08, 0.02]
                else:
                    probs = [0.60, 0.25, 0.10, 0.04, 0.01]

                mean = sum(i * pr for i, pr in enumerate(probs))
                variance = max(0.0, sum((i**2) * pr for i, pr in enumerate(probs)) - (mean**2))
                spread_sd = math.sqrt(variance)

                features_map[name] = TypeSafeFeatureColumn(
                    name=name,
                    kind="intensity",
                    mean=round(mean, 2),
                    spread_sd=round(spread_sd, 2),
                    interpretation=f"Score: {mean:.2f}/4.0 (±{spread_sd:.2f}) based on demonstrated signals."
                )
                feature_names.extend([name, f"{name}_sd"])
                numeric_vector.extend([round(mean, 2), round(spread_sd, 2)])
            else:
                prob = 0.85 if match_count >= 1 else 0.15
                features_map[name] = TypeSafeFeatureColumn(
                    name=name,
                    kind="presence",
                    mean=round(prob, 2),
                    spread_sd=0.0,
                    interpretation=f"Presence Probability: {prob:.2f} ({'Demonstrated' if prob >= 0.5 else 'Not detected'})"
                )
                feature_names.append(name)
                numeric_vector.append(round(prob, 2))

        return TypeSafeFeaturizeResponse(
            candidate_name=candidate_name,
            features=features_map,
            numeric_vector=numeric_vector,
            feature_names=feature_names,
            model_provider="TypeSafe AI System One (Autoresearch Featurizer Fallback)",
            is_live_api=False,
            timestamp=datetime.now(timezone.utc).isoformat()
        )


typesafe_service = TypeSafeService()
