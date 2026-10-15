"""
services/market_intelligence/fit_scorer.py
==========================================
Deterministic job-fit scoring engine for C2C student-job matching.
Incorporates 5-Dimension Evaluation (H1: ai-job-search rubric adaptation)
plus Psychometric and Signal Calibration.

Public API
----------
score_job_fit(posting: str, candidate: dict) -> dict
generate_job_match_card(posting: str, candidate: dict, job_meta: dict | None) -> dict
"""

from __future__ import annotations

import re
from typing import Optional

from services.market_intelligence.lead_intel import (
    clean_text,
    compute_signal_quality,
    extract_location,
    extract_tech_stack,
)

# ─── Role keyword mapping ────────────────────────────────────────────────────

_ROLE_KEYWORDS: dict[str, list[str]] = {
    "software_engineer": [
        "software engineer", "software developer", "sde", "full stack",
        "fullstack", "backend developer", "frontend developer", "web developer",
    ],
    "data_analyst": [
        "data analyst", "business analyst", "analytics engineer", "bi analyst",
        "reporting analyst",
    ],
    "data_scientist": [
        "data scientist", "ml engineer", "machine learning engineer",
        "ai engineer", "research scientist",
    ],
    "devops": [
        "devops", "sre", "site reliability", "platform engineer",
        "cloud engineer", "infrastructure engineer",
    ],
    "product": [
        "product manager", "product owner", "program manager", "scrum master",
    ],
    "design": [
        "ui designer", "ux designer", "ui/ux", "product designer",
        "graphic designer",
    ],
    "sales": [
        "sales", "business development", "bd executive", "account executive",
        "growth",
    ],
    "marketing": [
        "marketing", "digital marketing", "seo", "content writer",
        "social media",
    ],
    "finance": [
        "finance", "accountant", "financial analyst", "ca", "chartered",
        "audit",
    ],
    "hr": [
        "hr", "human resources", "talent acquisition", "recruiter",
        "people operations",
    ],
}

# Seniority vocabulary
_FRESHER_RE = re.compile(
    r"\b(fresher|fresh graduate|entry.?level|0.?1\s*year|no experience|"
    r"recent graduate|trainee|intern|junior)\b",
    re.IGNORECASE,
)
_SENIOR_RE = re.compile(
    r"\b(\d+\+?\s*years?\s*(of)?\s*experience|senior|lead|principal|"
    r"architect|manager|director|vp)\b",
    re.IGNORECASE,
)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _detect_role_family(text: str) -> Optional[str]:
    """Return the best-matching role-family key for the posting text."""
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for family, keywords in _ROLE_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits:
            scores[family] = hits
    if not scores:
        return None
    return max(scores, key=lambda k: scores[k])


def _candidate_role_family(candidate: dict) -> Optional[str]:
    """Derive role family from candidate target_roles and department."""
    target_roles: list[str] = candidate.get("target_roles") or []
    department: str = candidate.get("department", "") or ""
    combined = " ".join(target_roles) + " " + department
    return _detect_role_family(combined)


def _grade(score: int) -> str:
    """Convert 0-100 score to letter grade A/B/C/D."""
    if score >= 80:
        return "A"
    if score >= 65:
        return "B"
    if score >= 50:
        return "C"
    return "D"


def _safe_int(val, default: int = 0, lo: int = 0, hi: int = 100) -> int:
    """Clamp an arbitrary value to [lo, hi] int range."""
    try:
        return max(lo, min(hi, int(val or default)))
    except (TypeError, ValueError):
        return default


# ─── Scoring dimensions ───────────────────────────────────────────────────────

def _score_role_alignment(posting: str, candidate: dict) -> tuple[int, list, list]:
    """
    Role alignment: 0-20 points.
    Matches posting role family vs candidate target_roles / department.
    """
    job_family = _detect_role_family(posting)
    cand_family = _candidate_role_family(candidate)

    if job_family and cand_family and job_family == cand_family:
        return 20, [f"Role family match: {job_family}"], []
    if job_family and cand_family:
        return 8, [], [f"Role mismatch: job={job_family}, candidate={cand_family}"]
    if job_family is None:
        return 10, ["Unspecified role — partial credit"], []
    return 5, [], ["Candidate target roles don't match posting"]


def _score_tech_stack(posting: str, candidate: dict) -> tuple[int, list, list]:
    """
    Tech stack coverage: 0-25 points.
    Ratio of candidate skills matching posting tech terms.
    """
    job_tech = set(t.lower() for t in extract_tech_stack(posting))
    raw_skills = candidate.get("skills") or []
    cand_skills = set(str(s).lower() for s in raw_skills if s)

    if not job_tech:
        return 12, ["No specific tech requirements in posting"], []

    matched = job_tech & cand_skills
    gaps = job_tech - cand_skills

    if not cand_skills:
        return 0, [], [f"Candidate has no skills listed; job requires: {', '.join(list(job_tech)[:5])}"]

    coverage = len(matched) / len(job_tech)
    pts = int(coverage * 25)
    match_pts = [f"Skill match: {', '.join(sorted(matched)[:5])}"] if matched else []
    gap_pts = [f"Missing: {', '.join(sorted(gaps)[:5])}"] if gaps else []
    return pts, match_pts, gap_pts


def _score_seniority(posting: str, candidate: dict) -> tuple[int, list, list]:
    """
    Seniority fit: 0-20 points.
    Freshers score highest when posting is fresher-friendly or unspecified.
    """
    is_fresher_post = bool(_FRESHER_RE.search(posting))
    is_senior_post = bool(_SENIOR_RE.search(posting))

    years: int = _safe_int(candidate.get("experience_years", 0), lo=0, hi=40)
    dept: str = (candidate.get("department") or "").lower()
    is_campus = "student" in dept or years <= 1

    if is_fresher_post and is_campus:
        return 20, ["Entry-level posting matches campus profile"], []
    if is_fresher_post and not is_campus:
        return 10, [], ["Fresher posting but candidate has experience"]
    if is_senior_post and is_campus:
        return 5, [], ["Senior role — campus candidate unlikely to qualify"]
    if not is_fresher_post and not is_senior_post:
        return 15, ["Seniority unspecified — moderate fit assumed"], []
    return 15, ["Seniority broadly compatible"], []


def _score_psychometric(candidate: dict) -> tuple[int, list, list]:
    """
    Psychometric bonus: 0-15 points.
    Uses iq_score (0-100), eq_score (0-100), aq_score (0-100).
    Composite = mean of the three, scaled to 15.
    """
    iq = _safe_int(candidate.get("iq_score"))
    eq = _safe_int(candidate.get("eq_score"))
    aq = _safe_int(candidate.get("aq_score"))

    defined = [(v, n) for v, n in [(iq, "IQ"), (eq, "EQ"), (aq, "AQ")] if v > 0]
    if not defined:
        return 7, ["Psychometric data not available — neutral score"], []

    avg = sum(v for v, _ in defined) / len(defined)
    pts = int((avg / 100) * 15)
    labels = [f"{n}={v}" for v, n in defined]
    return pts, [f"Psychometric composite: {', '.join(labels)}"], []


def _score_location(posting: str, candidate: dict) -> tuple[int, list, list]:
    """
    Location compatibility: 0-10 points.
    Remote = full marks. Same city = full marks. Mismatch = partial.
    """
    job_loc = extract_location(posting)
    cand_loc = (candidate.get("location") or "").lower()

    if not job_loc:
        return 7, ["Location unspecified — partial credit"], []
    if "remote" in job_loc.lower():
        return 10, ["Remote role — location compatible"], []
    if not cand_loc:
        return 5, [], ["Candidate location not specified"]
    if job_loc.lower() in cand_loc or cand_loc in job_loc.lower():
        return 10, [f"Location match: {job_loc}"], []
    return 3, [], [f"Location mismatch: job={job_loc}, candidate={cand_loc}"]


def _score_signal(posting: str) -> tuple[int, list, list]:
    """
    Signal quality of posting: 0-10 points (scales from compute_signal_quality).
    """
    sq = compute_signal_quality(posting)
    raw = sq.get("score", 50)
    pts = int((raw / 100) * 10)
    return pts, [f"Posting quality score: {raw}"], []


# ─── Main scoring entry point ─────────────────────────────────────────────────

def score_job_fit(posting: str, candidate: dict) -> dict:
    """
    Score a job description against a candidate profile.
    """
    posting = clean_text(posting)

    ra_pts, ra_match, ra_gaps = _score_role_alignment(posting, candidate)
    ts_pts, ts_match, ts_gaps = _score_tech_stack(posting, candidate)
    sn_pts, sn_match, sn_gaps = _score_seniority(posting, candidate)
    ps_pts, ps_match, ps_gaps = _score_psychometric(candidate)
    lc_pts, lc_match, lc_gaps = _score_location(posting, candidate)
    sq_pts, sq_match, sq_gaps = _score_signal(posting)

    total = ra_pts + ts_pts + sn_pts + ps_pts + lc_pts + sq_pts

    return {
        "score": min(100, total),
        "grade": _grade(total),
        "breakdown": {
            "role_alignment": ra_pts,
            "tech_stack_coverage": ts_pts,
            "seniority_fit": sn_pts,
            "psychometric_bonus": ps_pts,
            "location_compatibility": lc_pts,
            "signal_quality": sq_pts,
        },
        "match_points": ra_match + ts_match + sn_match + ps_match + lc_match + sq_match,
        "gaps": ra_gaps + ts_gaps + sn_gaps + ps_gaps + lc_gaps + sq_gaps,
    }


# ─── H1: Multi-Dimension Job Match Card Generator ────────────────────────────

def generate_job_match_card(posting: str, candidate: dict, job_meta: Optional[dict] = None) -> dict:
    """
    Generate a 5-Dimension Scored Job Match Card inspired by ai-job-search framework.

    Dimensions:
    1. Technical Skills Match (0-100)
    2. Experience / Seniority Match (0-100)
    3. Behavioral & Culture Fit (0-100) - derived from Candidate Archetype + EQ/AQ
    4. Location & Logistics (0-100 + Pass/Fail)
    5. Career & Placement Alignment (0-100)
    """
    job_meta = job_meta or {}
    fit = score_job_fit(posting, candidate)
    breakdown = fit["breakdown"]

    # 1. Tech Skills (Scale from 0-25 to 0-100)
    tech_score = min(100, int((breakdown["tech_stack_coverage"] / 25) * 100))

    # 2. Experience / Seniority (Scale from 0-20 to 0-100)
    exp_score = min(100, int((breakdown["seniority_fit"] / 20) * 100))

    # 3. Behavioral & Culture Fit (Derived from Archetype + AQ/EQ)
    archetype = (candidate.get("archetype") or "THE_BUILDER").upper()
    eq = _safe_int(candidate.get("eq_score", 70))
    aq = _safe_int(candidate.get("aq_score", 70))
    culture_base = int((eq * 0.5) + (aq * 0.5))

    # Archetype affinity
    posting_lower = posting.lower()
    archetype_boost = 0
    if "BUILDER" in archetype and any(k in posting_lower for k in ["build", "startup", "fast-paced", "scale", "engineer"]):
        archetype_boost = 10
    elif "LEADER" in archetype and any(k in posting_lower for k in ["lead", "manage", "coordinate", "stakeholder"]):
        archetype_boost = 10
    elif "ANCHOR" in archetype and any(k in posting_lower for k in ["reliable", "process", "quality", "stability", "compliance"]):
        archetype_boost = 10
    culture_score = min(100, culture_base + archetype_boost)

    # 4. Location & Logistics (0-100 + Status)
    loc_score = min(100, int((breakdown["location_compatibility"] / 10) * 100))
    loc_status = "PASS" if loc_score >= 70 else ("FLAG" if loc_score >= 40 else "FAIL")

    # 5. Career & Placement Alignment (0-100)
    role_score = min(100, int((breakdown["role_alignment"] / 20) * 100))
    placement_readiness = _safe_int(candidate.get("placement_readiness_score", 75))
    career_score = min(100, int((role_score * 0.6) + (placement_readiness * 0.4)))

    # TypeSafe AI System One Autoresearch Featurization
    typesafe_telemetry = None
    typesafe_alignment_score = None
    try:
        from api.services.typesafe_service import typesafe_service
        candidate_text = f"{candidate.get('bio', '')} {' '.join(candidate.get('skills', []))} {candidate.get('department', '')}"
        ts_res = typesafe_service.featurize(
            free_text=candidate_text,
            candidate_name=candidate.get("full_name") or "Candidate"
        )
        if ts_res:
            features_dict = {
                k: {
                    "mean": v.mean,
                    "spread_sd": v.spread_sd,
                    "kind": v.kind,
                    "interpretation": v.interpretation
                }
                for k, v in ts_res.features.items()
            }
            typesafe_telemetry = {
                "model_provider": ts_res.model_provider,
                "numeric_vector": ts_res.numeric_vector,
                "feature_names": ts_res.feature_names,
                "features": features_dict,
                "is_live_api": ts_res.is_live_api
            }

            # Calculate probe match against job posting keywords
            probes_matched = []
            if any(w in posting_lower for w in ["system", "architect", "scale", "database", "backend"]):
                f = features_dict.get("systems_architecture")
                if f:
                    probes_matched.append(f["mean"] / 4.0)
            if any(w in posting_lower for w in ["production", "deploy", "docker", "ci/cd", "kubernetes"]):
                f = features_dict.get("production_engineering")
                if f:
                    probes_matched.append(f["mean"] / 4.0)
            if any(w in posting_lower for w in ["async", "concurren", "parallel", "queue", "kafka"]):
                f = features_dict.get("concurrency_experience")
                if f:
                    probes_matched.append(f["mean"])
            if any(w in posting_lower for w in ["lead", "mentor", "manage", "ownership"]):
                f = features_dict.get("leadership_ownership")
                if f:
                    probes_matched.append(f["mean"] / 4.0)
            if any(w in posting_lower for w in ["startup", "fast", "scrappy", "hack"]):
                f = features_dict.get("startup_agility")
                if f:
                    probes_matched.append(f["mean"])

            if probes_matched:
                typesafe_alignment_score = min(100, int((sum(probes_matched) / len(probes_matched)) * 100))
    except Exception as e:
        logger.warning(f"TypeSafe AI featurization skipped in job match card: {e}")

    overall_fit = int((tech_score * 0.30) + (exp_score * 0.20) + (culture_score * 0.20) + (loc_score * 0.15) + (career_score * 0.15))

    match_dimensions = [
        {
            "name": "Technical Skills Match",
            "score": tech_score,
            "weight": "30%",
            "status": "Optimal" if tech_score >= 75 else ("Learnable Gap" if tech_score >= 45 else "High Gap"),
            "details": [p for p in fit["match_points"] if "Skill match" in p] or ["Baseline skill overlap evaluated"],
        },
        {
            "name": "Experience & Seniority Fit",
            "score": exp_score,
            "weight": "20%",
            "status": "Qualified" if exp_score >= 75 else "Stretch Role",
            "details": [p for p in fit["match_points"] if "Entry-level" in p or "Seniority" in p] or ["Seniority level compatible"],
        },
        {
            "name": "Behavioral & Culture Fit",
            "score": culture_score,
            "weight": "20%",
            "status": "Strong Synergy" if culture_score >= 80 else "Compatible",
            "details": [f"Archetype alignment: {archetype}", f"EQ: {eq} | AQ: {aq}"],
        },
        {
            "name": "Location & Logistics",
            "score": loc_score,
            "weight": "15%",
            "status": loc_status,
            "details": [p for p in fit["match_points"] if "Location" in p or "Remote" in p] or [f"Status: {loc_status}"],
        },
        {
            "name": "Placement & Career Alignment",
            "score": career_score,
            "weight": "15%",
            "status": "High Alignment" if career_score >= 75 else "Moderate Alignment",
            "details": [f"Placement readiness factor: {placement_readiness}%"],
        },
    ]

    if typesafe_alignment_score is not None:
        match_dimensions.append({
            "name": "TypeSafe AI Neural Rigor",
            "score": typesafe_alignment_score,
            "weight": "Bonus",
            "status": "Verified Rigor" if typesafe_alignment_score >= 70 else "Calibrating",
            "details": [
                f"Autoresearch Vector: 11-dimension float matrix calibrated",
                f"Model: {typesafe_telemetry.get('model_provider') if typesafe_telemetry else 'TypeSafe System One'}"
            ]
        })

    return {
        "job_title": job_meta.get("title") or "Opportunity Match",
        "company": job_meta.get("company") or "Hiring Entity",
        "overall_score": overall_fit,
        "grade": _grade(overall_fit),
        "dimensions": match_dimensions,
        "key_strengths": fit["match_points"][:4],
        "growth_gaps": fit["gaps"][:4],
        "typesafe_telemetry": typesafe_telemetry,
    }

