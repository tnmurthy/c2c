import os
import json
import logging
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from api.schemas.typesafe import (
    DimensionScore,
    FounderArchetype,
    TypeSafeEvaluateResponse,
    TypeSafeFeatureColumn,
    TypeSafeFeaturizeResponse,
    TypeSafeStatusResponse,
)
from api.services.typesafe_heuristics import (
    DIMENSIONS,
    _mean_and_sd,
    evaluate_heuristic,
    featurize_heuristic,
    percentile_band,
)

logger = logging.getLogger("c2c_api.typesafe")

TYPESAFE_API_URL = "https://api.typesafe.ai/v1/systemone"
TYPESAFE_MODEL = "jev-latest"
TIMEOUT_SECONDS = 10.0
LIVE_PROVIDER = "TypeSafe AI System One (Jev)"
NOUL_THRESHOLD = 0.5

INTENSITY_LEVELS = [
    "Not present in this candidate profile at all",
    "Barely present - mentioned once in passing",
    "Present at a moderate, competent level",
    "Present strongly - profile demonstrates deep hands-on execution",
    "Dominant - candidate profile is largely centered around this capability",
]

PRESENCE_CRITERIA = {
    "true": "The candidate profile explicitly confirms or clearly demonstrates this capability",
    "false": "The profile gives no clear indication of this capability",
}

DEFAULT_PROBES = [
    {"name": "production_engineering", "kind": "intensity", "question": "Degree of production-ready software practices (testing, CI/CD, docker, observability) evident in projects"},
    {"name": "systems_architecture", "kind": "intensity", "question": "Depth of system design, distributed systems, caching, or data modeling"},
    {"name": "problem_solving_rigor", "kind": "intensity", "question": "Complexity and scale of technical challenges solved"},
    {"name": "leadership_ownership", "kind": "intensity", "question": "Initiative, ownership of features end-to-end, and cross-team coordination"},
    {"name": "concurrency_experience", "kind": "presence", "question": "Does the candidate demonstrate experience with multithreading, async workers, or event-driven queues?"},
    {"name": "startup_agility", "kind": "presence", "question": "Demonstrates experience building rapidly under ambiguity, bootstrapping, or 0-to-1 prototyping"},
    {"name": "cross_functional_alignment", "kind": "presence", "question": "Demonstrates collaboration with designers, product managers, or non-technical business partners"},
]

# 5Q dimension definitions; each is judged as a Score over DIMENSION_LEVELS.
DIMENSION_DEFINITIONS = {
    "IQ": "logical structuring, analytical reasoning and clarity of thought",
    "EQ": "empathy, situational awareness and self-regulation",
    "AQ": "adversity quotient: resilience and persistence under ambiguity or setbacks",
    "SQ": "social collaboration, communication and persuasion",
    "SpQ": "purpose-driven alignment and ethical conviction",
}
DIMENSION_LEVELS = [
    "The responses show no evidence of this quality, or evidence against it",
    "The responses show weak or inconsistent evidence of this quality",
    "The responses show a moderate, typical level of this quality",
    "The responses show this quality clearly and consistently",
    "The responses show this quality as an exceptional, defining strength",
]

ARCHETYPE_CRITERIA = {
    "Builder": "Systems architect, iterative problem-solver, high technical curiosity.",
    "Leader": "Visionary, rallies groups, culture builder, high emotional intelligence.",
    "Rainmaker": "Stakeholder advocate, commercial communicator, resilient under rejection.",
    "Anchor": "Reliable operator, process guardian, highly consistent execution.",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _level_to_percent(score: float, level_count: int) -> float:
    return round(score / (level_count - 1) * 100.0, 1)


class TypeSafeService:
    """
    TypeSafe System One (Jev) integration.

    Calls the live API when a key is configured. On any failure it returns a
    heuristic estimate that is explicitly labelled as such (is_live_api=False).
    """

    @property
    def api_key(self) -> Optional[str]:
        key = os.getenv("TYPESAFE_API_KEY") or os.getenv("TYPESAFE_KEY")
        return key.strip() if key and key.strip() else None

    def get_status(self) -> TypeSafeStatusResponse:
        configured = self.api_key is not None
        return TypeSafeStatusResponse(
            provider="TypeSafe AI",
            flagship_model="Jev (System One)",
            api_key_configured=configured,
            latency_target_ms=50,
            supported_primitives=["Choice", "Score", "Noul"],
            status="online",
        )

    def _system_one(self, state: Any, questions: Dict[str, Any]) -> Dict[str, Any]:
        """POST to /v1/systemone and return the `answers` map. Raises on any failure."""
        req = urllib.request.Request(
            TYPESAFE_API_URL,
            data=json.dumps({"model": TYPESAFE_MODEL, "state": state, "questions": questions}).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "User-Agent": "c2c-typesafe-client/2.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"TypeSafe HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}") from e
        answers = data.get("answers")
        if not isinstance(answers, dict):
            raise RuntimeError("TypeSafe response missing 'answers'")
        usage = data.get("usage") or {}
        logger.info(
            "TypeSafe call ok: %d question(s), %s in / %s out tokens",
            len(questions), usage.get("input_tokens"), usage.get("output_tokens"),
        )
        return answers

    # ------------------------------------------------------------------ evaluate

    def evaluate(
        self,
        responses: List[Dict[str, Any]],
        candidate_name: str = "Candidate",
        custom_rubrics: Optional[Dict[str, str]] = None,
    ) -> TypeSafeEvaluateResponse:
        """Raises ValueError when there are no responses to judge."""
        if not responses:
            raise ValueError("No assessment responses to evaluate.")
        if self.api_key:
            try:
                return self._evaluate_live(responses, candidate_name, custom_rubrics or {})
            except Exception as e:
                logger.warning("TypeSafe evaluate failed, using heuristic estimate: %s", e)
        return evaluate_heuristic(responses, candidate_name)

    def _evaluate_questions(self, custom_rubrics: Dict[str, str]) -> Dict[str, Any]:
        questions: Dict[str, Any] = {
            "archetype": {
                "type": "choice",
                "instructions": "Which founder archetype best describes the candidate, judging from their behavioural assessment `responses`?",
                "criteria": ARCHETYPE_CRITERIA,
            },
            "placement_ready": {
                "type": "noul",
                "instructions": "Do the candidate's `responses` show readiness for immediate corporate or startup placement?",
                "criteria": {
                    "true": "The responses show the maturity, reasoning and resilience expected of a new hire",
                    "false": "The responses show gaps that should be developed before placement",
                },
            },
            "requires_intervention": {
                "type": "noul",
                "instructions": "Do the candidate's `responses` indicate burnout, flight risk, or a severe skill gap that needs a mentor's intervention?",
                "criteria": {
                    "true": "There are clear warning signs that a mentor should act on",
                    "false": "There are no clear warning signs",
                },
            },
        }
        for dim in DIMENSIONS:
            definition = custom_rubrics.get(dim) or DIMENSION_DEFINITIONS[dim]
            questions[dim] = {
                "type": "score",
                "instructions": f"How strongly do the candidate's assessment `responses` demonstrate {dim} ({definition})?",
                "criteria": DIMENSION_LEVELS,
            }
        return questions

    def _evaluate_live(
        self, responses: List[Dict[str, Any]], candidate_name: str, custom_rubrics: Dict[str, str]
    ) -> TypeSafeEvaluateResponse:
        answers = self._system_one({"responses": responses}, self._evaluate_questions(custom_rubrics))

        scores: Dict[str, DimensionScore] = {}
        for dim in DIMENSIONS:
            ans = answers[dim]
            percent = _level_to_percent(float(ans["score"]), len(DIMENSION_LEVELS))
            scores[dim] = DimensionScore(
                score=percent,
                percentile_band=percentile_band(percent),
                confidence=float(ans.get("confidence") or 0.0),
                rationale=f"Jev level {float(ans['score']):.2f} of 0-{len(DIMENSION_LEVELS) - 1} on the {dim} rubric.",
            )

        archetype = answers["archetype"]
        placement_p = float(answers["placement_ready"]["noul"])
        intervention_p = float(answers["requires_intervention"]["noul"])

        return TypeSafeEvaluateResponse(
            candidate_name=candidate_name,
            primary_archetype=FounderArchetype(archetype["choice"]),
            archetype_probabilities={k: float(v) for k, v in archetype.get("probabilities", {}).items()},
            scores=scores,
            placement_ready=placement_p >= NOUL_THRESHOLD,
            placement_ready_probability=placement_p,
            requires_intervention=intervention_p >= NOUL_THRESHOLD,
            requires_intervention_probability=intervention_p,
            ai_confidence=float(archetype.get("confidence") or 0.0),
            model_provider=LIVE_PROVIDER,
            is_live_api=True,
            timestamp=_now(),
        )

    # ----------------------------------------------------------------- featurize

    def featurize(
        self,
        free_text: str,
        candidate_name: str = "Candidate",
        custom_probes: Optional[List[Dict[str, str]]] = None,
    ) -> TypeSafeFeaturizeResponse:
        """
        Turns candidate free text into a numeric feature vector (Autoresearch Feature Discovery):
        intensity probes -> (mean level, spread sd); presence probes -> probability.
        """
        probes = custom_probes or DEFAULT_PROBES
        # No text means no evidence to judge; skip the paid call.
        if self.api_key and free_text.strip():
            try:
                return self._featurize_live(free_text, candidate_name, probes)
            except Exception as e:
                logger.warning("TypeSafe featurize failed, using heuristic estimate: %s", e)
        return featurize_heuristic(free_text, candidate_name, probes)

    def _featurize_live(
        self, free_text: str, candidate_name: str, probes: List[Dict[str, str]]
    ) -> TypeSafeFeaturizeResponse:
        questions = {
            p["name"]: (
                {"type": "score", "instructions": f"{p['question']}, judging from `profile_text`.", "criteria": INTENSITY_LEVELS}
                if p["kind"] == "intensity"
                else {"type": "noul", "instructions": f"{p['question']} Judge from `profile_text`.", "criteria": PRESENCE_CRITERIA}
            )
            for p in probes
        }
        answers = self._system_one({"profile_text": free_text}, questions)

        features: Dict[str, TypeSafeFeatureColumn] = {}
        vector: List[float] = []
        names: List[str] = []
        for p in probes:
            name = p["name"]
            ans = answers[name]
            if p["kind"] == "intensity":
                raw = ans.get("probabilities") or {}
                probs = [float(raw.get(str(i), raw.get(i, 0.0))) for i in range(len(INTENSITY_LEVELS))]
                _, sd = _mean_and_sd(probs)
                mean = float(ans["score"])
                features[name] = TypeSafeFeatureColumn(
                    name=name, kind="intensity", mean=round(mean, 2), spread_sd=round(sd, 2),
                    interpretation=f"Jev level {mean:.2f}/4.0 (±{sd:.2f}).",
                )
                names.extend([name, f"{name}_sd"])
                vector.extend([round(mean, 2), round(sd, 2)])
            else:
                prob = float(ans["noul"])
                features[name] = TypeSafeFeatureColumn(
                    name=name, kind="presence", mean=round(prob, 2), spread_sd=0.0,
                    interpretation=f"Jev probability {prob:.2f} that this is demonstrated.",
                )
                names.append(name)
                vector.append(round(prob, 2))

        return TypeSafeFeaturizeResponse(
            candidate_name=candidate_name,
            features=features,
            numeric_vector=vector,
            feature_names=names,
            model_provider=LIVE_PROVIDER,
            is_live_api=True,
            timestamp=_now(),
        )


typesafe_service = TypeSafeService()
