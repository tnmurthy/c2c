"""
services/market_intelligence/fit_scorer.py
==========================================
Deterministic job-fit scoring engine for C2C student-job matching.
No LLM, no external calls.

Public API
----------
score_job_fit(posting: str, candidate: dict) -> dict
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
    cand_skills = set(s.lower() for s in (candidate.get("skills") or []))

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

    # Infer candidate seniority from years_of_experience or department keywords
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
    if job_loc.lower() in cand_loc or cand_loc in job_loc.lower():
        return 10, [f"Location match: {job_loc}"], []
    if not cand_loc:
        return 5, [], ["Candidate location not specified"]
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

    Parameters
    ----------
    posting : str
        Raw job description / requirements text.
    candidate : dict
        Keys: full_name (str), skills (list[str]), department (str),
              target_roles (list[str]), location (str),
              iq_score (int|None), eq_score (int|None), aq_score (int|None),
              archetype (str|None), experience_years (int|None).

    Returns
    -------
    dict
        {
          score: int (0-100),
          grade: str ('A'|'B'|'C'|'D'),
          breakdown: dict[str, int],
          match_points: list[str],
          gaps: list[str],
        }
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
