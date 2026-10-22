"""
P3-B: rank candidates for a job.

fit_score = 5Q role fit (assessment) blended with requirement evidence, where
evidence is TypeSafe's per-requirement Score over the candidate's profile text.
Weights live here in code, so they change without re-asking the model.

Cost controls:
- cheap filter first: only the best JUDGE_LIMIT candidates by 5Q are judged;
- a stored judgment is reused while the profile, job text and requirements are unchanged;
- every call is claimed against the daily caps (source 'typesafe_match').
"""
import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional

from api.services.candidate_features import profile_text
from api.services.typesafe_service import REQUIREMENT_LEVELS, typesafe_service

logger = logging.getLogger("c2c_api.matching")

ROLE_WEIGHTS: Dict[str, Dict[str, float]] = {
    "tech":       {"IQ": 0.40, "AQ": 0.30, "EQ": 0.20, "SQ": 0.05, "SpQ": 0.05},
    "sales":      {"IQ": 0.10, "AQ": 0.20, "EQ": 0.35, "SQ": 0.35, "SpQ": 0.00},
    "ops":        {"IQ": 0.30, "AQ": 0.25, "EQ": 0.25, "SQ": 0.15, "SpQ": 0.05},
    "leadership": {"IQ": 0.20, "AQ": 0.20, "EQ": 0.30, "SQ": 0.25, "SpQ": 0.05},
}

FIVE_Q_WEIGHT = 0.5
EVIDENCE_WEIGHT = 0.5
TOP_N = 20
JUDGE_LIMIT = 40
MAX_REQUIREMENTS = 8
WORKERS = 8
ALERT_THRESHOLD = 75.0
# Bump when REQUIREMENT_LEVELS or the question wording change, so stored judgments are redone.
PROMPT_VERSION = "v1"


def calculate_match_score(dimension_scores: Dict[str, Any], role_type: str = "tech") -> float:
    """Compute weighted 5Q match score (0-100) for a given role type."""
    weights = ROLE_WEIGHTS.get(role_type, ROLE_WEIGHTS["tech"])
    max_possible = sum(w * 100 for w in weights.values())
    raw = sum(weights.get(dim, 0) * float(score) for dim, score in dimension_scores.items())
    return round((raw / max_possible) * 100, 1) if max_possible > 0 else 0.0


def clean_requirements(requirements: Any) -> List[str]:
    """Trimmed, de-duplicated (case-insensitive), at most MAX_REQUIREMENTS."""
    seen, out = set(), []
    for r in requirements if isinstance(requirements, list) else []:
        text = str(r).strip()
        if text and text.lower() not in seen:
            seen.add(text.lower())
            out.append(text)
    return out[:MAX_REQUIREMENTS]


def match_input_hash(text: str, job: Dict[str, str], requirements: List[str]) -> str:
    key = "\n".join([PROMPT_VERSION, text, job.get("title", ""), job.get("description", ""), *requirements])
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def evidence_score(evidence: Dict[str, Dict[str, float]]) -> float:
    """Mean requirement level as 0-100."""
    top = len(REQUIREMENT_LEVELS) - 1
    levels = [e["level"] for e in evidence.values()]
    return round(sum(levels) / len(levels) / top * 100, 1) if levels else 0.0


def fit_score(five_q: float, evidence: Optional[float]) -> float:
    if evidence is None:
        return round(five_q, 1)
    return round(FIVE_Q_WEIGHT * five_q + EVIDENCE_WEIGHT * evidence, 1)


def _latest_assessments(client, student_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    res = client.table("assessments").select("student_id, dimension_scores, created_at").in_("student_id", student_ids).execute()
    latest: Dict[str, Dict[str, Any]] = {}
    for a in res.data or []:
        sid = a["student_id"]
        if sid not in latest or (a.get("created_at") or "") > (latest[sid].get("created_at") or ""):
            latest[sid] = a
    return latest


def _existing_matches(client, job_id: str) -> Dict[str, Dict[str, Any]]:
    res = client.table("job_candidate_matches").select("student_id, input_hash, evidence, status").eq("job_id", job_id).execute()
    return {r["student_id"]: r for r in res.data or []}


def build_candidates(job: Dict[str, Any], students: List[Dict[str, Any]], latest: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Every assessed student with their 5Q role fit, best first."""
    role_type = job.get("role_type") or "tech"
    rows = [
        {"student": s, "five_q": calculate_match_score(latest[s["id"]].get("dimension_scores") or {}, role_type)}
        for s in students
        if s["id"] in latest
    ]
    return sorted(rows, key=lambda r: r["five_q"], reverse=True)


def judge_shortlist(
    candidates: List[Dict[str, Any]],
    job_text: Dict[str, str],
    requirements: List[str],
    existing: Dict[str, Dict[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    """Returns {student_id: {"evidence", "input_hash"}} for the judged shortlist; reuses stored judgments."""
    judged: Dict[str, Dict[str, Any]] = {}
    to_call = []
    for c in candidates[:JUDGE_LIMIT]:
        sid, text = c["student"]["id"], profile_text(c["student"])
        if not text:
            continue
        h = match_input_hash(text, job_text, requirements)
        prev = existing.get(sid)
        if prev and prev.get("input_hash") == h and prev.get("evidence"):
            judged[sid] = {"evidence": prev["evidence"], "input_hash": h}
        else:
            to_call.append((sid, text, h))

    reused = len(judged)
    if to_call:
        def call(item):
            sid, text, h = item
            return sid, h, typesafe_service.judge_requirements(text, job_text, requirements, student_id=sid)

        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for sid, h, evidence in pool.map(call, to_call):
                if evidence:
                    judged[sid] = {"evidence": evidence, "input_hash": h}

    logger.info("Match shortlist: %d reused, %d asked, %d judged", reused, len(to_call), len(judged))
    return judged


def rank_matches(candidates: List[Dict[str, Any]], judged: Dict[str, Dict[str, Any]], job_id: str) -> List[Dict[str, Any]]:
    rows = []
    for c in candidates:
        sid = c["student"]["id"]
        j = judged.get(sid)
        ev = evidence_score(j["evidence"]) if j else None
        rows.append({
            "job_id": job_id,
            "student_id": sid,
            "five_q_score": c["five_q"],
            "evidence_score": ev,
            "evidence": j["evidence"] if j else {},
            "input_hash": j["input_hash"] if j else None,
            "fit_score": fit_score(c["five_q"], ev),
        })
    rows.sort(key=lambda r: r["fit_score"], reverse=True)
    top = rows[:TOP_N]
    for i, r in enumerate(top, start=1):
        r["rank"] = i
    return top


def score_candidates_for_job(client, job_id: str) -> Dict[str, Any]:
    """Scores all assessed students for a job and stores the top TOP_N. Safe to re-run."""
    job_res = client.table("job_postings").select("*").eq("id", job_id).execute()
    if not job_res.data:
        raise LookupError(f"Job {job_id} not found")
    job = job_res.data[0]
    requirements = clean_requirements(job.get("requirements"))
    job_text = {"title": job.get("title") or "", "description": job.get("description") or ""}

    students = client.table("students").select("id, full_name, bio, skills, department").execute().data or []
    latest = _latest_assessments(client, [s["id"] for s in students]) if students else {}
    candidates = build_candidates(job, students, latest)
    existing = _existing_matches(client, job_id)

    judged = judge_shortlist(candidates, job_text, requirements, existing) if requirements else {}
    top = rank_matches(candidates, judged, job_id)

    if top:
        # status is not sent, so an employer's decision on an existing row is kept.
        client.table("job_candidate_matches").upsert(top, on_conflict="job_id,student_id").execute()
    keep = {r["student_id"] for r in top}
    stale = [sid for sid, r in existing.items() if sid not in keep and r.get("status") == "PENDING"]
    if stale:
        client.table("job_candidate_matches").delete().eq("job_id", job_id).in_("student_id", stale).execute()

    # Older views read job_postings.match_scores and match_alerts.
    client.table("job_postings").update({"match_scores": {r["student_id"]: r["fit_score"] for r in top}}).eq("id", job_id).execute()
    alerts = [{"student_id": r["student_id"], "job_id": job_id, "score": int(r["fit_score"])} for r in top if r["fit_score"] >= ALERT_THRESHOLD]
    if alerts:
        try:
            client.table("match_alerts").upsert(alerts, on_conflict="student_id,job_id").execute()
        except Exception as e:
            logger.warning("match_alerts upsert failed for job %s: %s", job_id, e)

    summary = {"job_id": job_id, "candidates": len(candidates), "ranked": len(top),
               "evidence_judged": len(judged), "alerts": len(alerts)}
    logger.info("Scored job %s: %s", job_id, summary)
    return summary
