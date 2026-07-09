"""
services/market_intelligence/lead_intel.py
===========================================
Pure-Python lead intelligence extraction.
No external dependencies — stdlib only (re, hashlib).

Functions
---------
clean_text          Collapse whitespace in raw strings.
extract_budget      Detect salary / budget figures.
extract_tech_stack  Match against a 60+ term curated tech list.
extract_location    Detect remote / major Indian cities.
extract_company     Heuristic company name extraction.
extract_urgency     Detect urgency signals in text.
compute_signal_quality  Score 0-100 for posting quality.
extract_lead_intel  Unified extraction returning a structured dict.
"""

from __future__ import annotations

import hashlib
import re
from typing import Optional

# ─── Tech-term corpus ─────────────────────────────────────────────────────────

_TECH_TERMS: list[str] = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "Go", "Rust", "Ruby",
    "Swift", "Kotlin", "C#", ".NET", "R", "MATLAB", "Bash",
    # Web frameworks
    "Django", "Flask", "FastAPI", "React", "Next.js", "Vue", "Angular",
    "Node.js", "Spring Boot", "Ruby on Rails",
    # Mobile
    "Flutter", "React Native",
    # Databases
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis",
    # Cloud & infra
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Linux", "CI/CD",
    # BaaS / hosted
    "Supabase", "Firebase",
    # AI / ML
    "TensorFlow", "PyTorch", "scikit-learn", "AI", "LLM", "RAG", "NLP",
    "OpenAI", "Hugging Face",
    # APIs & architecture
    "API", "REST", "GraphQL", "Microservices",
    # Data engineering
    "Hadoop", "Spark", "Airflow", "dbt",
    # BI / analytics
    "Tableau", "Power BI", "Excel",
    # Design
    "Figma",
    # Process
    "Git", "Agile", "Scrum",
]

# Build a single compiled pattern for fast multi-term matching
_TECH_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in _TECH_TERMS) + r")\b",
    re.IGNORECASE,
)

# ─── Location corpus ──────────────────────────────────────────────────────────

_LOCATION_PATTERNS: list[tuple[str, str]] = [
    (r"\bremote\s*india\b", "Remote India"),
    (r"\bfully\s+remote\b", "Remote"),
    (r"\bwork\s+from\s+home\b", "Remote"),
    (r"\bwfh\b", "Remote"),
    (r"\bremote\b", "Remote"),
    (r"\bhyderabad\b", "Hyderabad"),
    (r"\bbangalore\b|\bbengaluru\b", "Bangalore"),
    (r"\bmumbai\b|\bbombay\b", "Mumbai"),
    (r"\bdelhi\b|\bnew\s+delhi\b|\bncr\b", "Delhi"),
    (r"\bpune\b", "Pune"),
    (r"\bchennai\b|\bmadras\b", "Chennai"),
    (r"\bkolkata\b|\bcalcutta\b", "Kolkata"),
    (r"\bahmedabad\b", "Ahmedabad"),
    (r"\bnoida\b", "Noida"),
    (r"\bgurgaon\b|\bgurugram\b", "Gurgaon"),
    (r"\bjaipur\b", "Jaipur"),
    (r"\bindore\b", "Indore"),
    (r"\bcoimbatore\b", "Coimbatore"),
    (r"\bkochi\b|\bcochi\b|\bcochin\b", "Kochi"),
    (r"\bvisakhapatnam\b|\bvizag\b", "Vizag"),
]

_LOCATION_COMPILED = [
    (re.compile(pat, re.IGNORECASE), label)
    for pat, label in _LOCATION_PATTERNS
]

# ─── Urgency terms ────────────────────────────────────────────────────────────

_URGENCY_TERMS = re.compile(
    r"\b(urgent|immediate(ly)?|asap|as soon as possible|right away|"
    r"hire now|start immediately|joining immediately|quick joiner|"
    r"join asap|notice period\s*[:–-]?\s*0|available immediately)\b",
    re.IGNORECASE,
)

# ─── Budget patterns ─────────────────────────────────────────────────────────

_BUDGET_PATTERNS = [
    # $50,000 / $50k / $50K
    re.compile(r"\$\s*[\d,]+\s*(?:k|K)?(?:\s*[-–]\s*\$?\s*[\d,]+\s*(?:k|K)?)?"),
    # INR 5,00,000 / INR 6L / INR 6 LPA
    re.compile(r"\bINR\s*[\d,]+(?:\s*(?:L|Lakh|LPA|lakhs?))?\b", re.IGNORECASE),
    # ₹ symbol
    re.compile(r"₹\s*[\d,]+(?:\s*(?:L|Lakh|LPA|lakhs?|k|K))?"),
    # Budget: / Salary: / CTC: / Package: lines
    re.compile(
        r"(?:budget|salary|ctc|package|compensation|stipend)\s*[:–-]\s*"
        r"[\w\s$₹,.-]{3,40}",
        re.IGNORECASE,
    ),
    # X LPA / X to Y LPA
    re.compile(r"\d+(?:\.\d+)?\s*(?:to|-)\s*\d+(?:\.\d+)?\s*LPA\b", re.IGNORECASE),
    re.compile(r"\d+(?:\.\d+)?\s*LPA\b", re.IGNORECASE),
]

# ─── Company heuristics ───────────────────────────────────────────────────────

_COMPANY_PATTERNS = [
    # "Company: Acme Corp" or "Organization: Acme"
    re.compile(
        r"(?:company|organisation|organization|employer|client|firm)\s*[:–-]\s*"
        r"([A-Z][^\n\r|]{2,50})",
        re.IGNORECASE,
    ),
    # "at Acme Corp" as trailing context
    re.compile(r"\bat\s+([A-Z][A-Za-z0-9 &.,'-]{2,40}(?:Pvt\.?\s*Ltd\.?|Inc\.?|LLC|Corp\.?|Technologies|Solutions|Labs|Systems)?)\b"),
    # "Hiring for / from Acme"
    re.compile(r"(?:hiring\s+(?:for|from|at)|posted\s+by)\s+([A-Z][A-Za-z0-9 &.,'-]{2,40})\b", re.IGNORECASE),
]

# ─── Red-flag terms (used in quality_gate) ────────────────────────────────────

RED_FLAG_TERMS = re.compile(
    r"\b(bond period|training bond|security deposit|registration fee|"
    r"joining fee|pay to join|deposit required|refundable deposit|"
    r"mlm|multi.?level marketing|pyramid|work from home\s+earning|"
    r"earn from home|daily target|referral income|commission only)\b",
    re.IGNORECASE,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    """Collapse all whitespace sequences to single spaces and strip edges."""
    if not isinstance(text, str):
        return ""
    return re.sub(r"\s+", " ", text).strip()


def extract_budget(text: str) -> Optional[str]:
    """
    Return the first budget/salary mention found in *text*, or None.

    Matches $amounts, INR / ₹ figures, LPA patterns, and labeled lines
    such as 'Salary: 6-8 LPA'.
    """
    text = clean_text(text)
    for pat in _BUDGET_PATTERNS:
        m = pat.search(text)
        if m:
            return clean_text(m.group(0))
    return None


def extract_tech_stack(text: str) -> list[str]:
    """
    Return unique tech-stack terms found in *text* (case-insensitive match,
    canonical casing from the corpus list returned).
    """
    text = clean_text(text)
    found_lower: set[str] = set()
    result: list[str] = []
    for m in _TECH_PATTERN.finditer(text):
        lower = m.group(0).lower()
        if lower not in found_lower:
            found_lower.add(lower)
            # Prefer corpus casing
            canonical = next(
                (t for t in _TECH_TERMS if t.lower() == lower), m.group(0)
            )
            result.append(canonical)
    return result


def extract_location(text: str) -> Optional[str]:
    """
    Return the first recognised location label from *text*, or None.

    Detection order: Remote India > Remote > named cities.
    """
    text = clean_text(text)
    for pat, label in _LOCATION_COMPILED:
        if pat.search(text):
            return label
    return None


def extract_company(text: str) -> Optional[str]:
    """
    Heuristic: find a company name using labeled-field and 'at Company' patterns.
    Returns the first clean match or None.
    """
    text = clean_text(text)
    for pat in _COMPANY_PATTERNS:
        m = pat.search(text)
        if m:
            raw = m.group(1).strip().rstrip(".,;")
            if 2 < len(raw) < 80:
                return raw
    return None


def extract_urgency(text: str) -> bool:
    """Return True if the posting contains urgency-signalling language."""
    return bool(_URGENCY_TERMS.search(clean_text(text)))


def compute_signal_quality(text: str) -> dict:
    """
    Score the quality of a raw job-posting text on a 0-100 scale.

    Dimensions
    ----------
    length_score   : 0-20  (≥400 chars for max)
    tech_score     : 0-30  (≥5 tech terms for max)
    budget_score   : 0-20  (budget present = 20)
    location_score : 0-15  (location present = 15)
    company_score  : 0-15  (company present = 15)

    Returns
    -------
    dict with keys: score (int), reason (str), tags (list[str])
    """
    text = clean_text(text)
    tags: list[str] = []
    score = 0

    # 1. Length
    char_len = len(text)
    length_pts = min(20, int((char_len / 400) * 20))
    score += length_pts
    if char_len < 140:
        tags.append("too_short")
    elif char_len >= 400:
        tags.append("detailed_jd")

    # 2. Tech stack
    tech = extract_tech_stack(text)
    tech_pts = min(30, len(tech) * 6)
    score += tech_pts
    if len(tech) >= 5:
        tags.append("tech_rich")
    elif len(tech) == 0:
        tags.append("no_tech_terms")

    # 3. Budget
    if extract_budget(text):
        score += 20
        tags.append("budget_disclosed")
    else:
        tags.append("no_budget")

    # 4. Location
    if extract_location(text):
        score += 15
        tags.append("location_specified")

    # 5. Company
    if extract_company(text):
        score += 15
        tags.append("company_identified")

    # 6. Red flags (deduct)
    if RED_FLAG_TERMS.search(text):
        score = max(0, score - 30)
        tags.append("red_flag")

    # 7. Urgency bonus (small positive signal when combined with quality)
    if extract_urgency(text):
        tags.append("urgent")

    reason = _quality_reason(score, tags)
    return {"score": min(100, score), "reason": reason, "tags": tags}


def _quality_reason(score: int, tags: list[str]) -> str:
    """Human-readable one-liner explaining the quality score."""
    if "red_flag" in tags:
        return "Red-flag terms detected (bond, deposit, MLM)"
    if score >= 80:
        return "High-quality posting with tech stack, budget, and company details"
    if score >= 60:
        return "Good posting; missing one or two key signals"
    if score >= 40:
        return "Moderate posting; lacks budget or company information"
    if "too_short" in tags:
        return "Posting is too short to evaluate reliably"
    return "Low-signal posting; insufficient detail"


def extract_lead_intel(text: str) -> dict:
    """
    Unified extraction from raw job-description text.

    Returns
    -------
    dict with keys:
        company       (str | None)
        location      (str | None)
        budget        (str | None)
        urgency       (bool)
        tech_stack    (list[str])
        signal_quality (dict)  — {score, reason, tags}
        fingerprint   (str)    — sha256 of cleaned text for dedup
    """
    cleaned = clean_text(text)
    fp = hashlib.sha256(cleaned.encode("utf-8", errors="replace")).hexdigest()[:16]
    return {
        "company": extract_company(cleaned),
        "location": extract_location(cleaned),
        "budget": extract_budget(cleaned),
        "urgency": extract_urgency(cleaned),
        "tech_stack": extract_tech_stack(cleaned),
        "signal_quality": compute_signal_quality(cleaned),
        "fingerprint": fp,
    }
