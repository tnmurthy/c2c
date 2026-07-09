"""
services/market_intelligence/quality_gate.py
=============================================
Deterministic lead-quality gate for C2C job leads.
No LLM, no external calls — pure business-rule scoring.

Public API
----------
evaluate_lead_quality(lead, *, min_quality, target_level, max_age_days) -> dict
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional

from services.market_intelligence.lead_intel import (
    RED_FLAG_TERMS,
    clean_text,
    compute_signal_quality,
)

# ─── Seniority vocabulary ────────────────────────────────────────────────────

_FRESHER_SIGNALS = re.compile(
    r"\b(fresher|fresh graduate|entry.?level|0.?1\s*year|no experience|"
    r"recent graduate|campus hire|trainee|intern|apprentice|junior)\b",
    re.IGNORECASE,
)

_SENIOR_SIGNALS = re.compile(
    r"\b(\d+\+?\s*years?\s*(of)?\s*experience|senior|lead|principal|"
    r"staff engineer|director|vp|head of|architect|manager)\b",
    re.IGNORECASE,
)

_TARGET_LEVEL_VOCAB: dict[str, re.Pattern] = {
    "fresher": _FRESHER_SIGNALS,
    "junior": re.compile(r"\b(junior|entry.?level|0.?2\s*year|associate)\b", re.IGNORECASE),
    "mid": re.compile(r"\b(mid.?level|3.?5\s*year|2.?4\s*year)\b", re.IGNORECASE),
    "senior": _SENIOR_SIGNALS,
}


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse ISO-8601 or YYYY-MM-DD date string, return aware UTC datetime."""
    if not date_str:
        return None
    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str[:26], fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def evaluate_lead_quality(
    lead: dict,
    *,
    min_quality: int = 60,
    target_level: str = "fresher",
    max_age_days: int = 14,
) -> dict:
    """
    Run quality gate checks on a raw job lead dict.

    Parameters
    ----------
    lead : dict
        Keys expected: text (str), url (str|None), posted_date (str|None),
        title (str|None).  Extra keys are ignored.
    min_quality : int
        Minimum signal_quality score (0-100) to pass; default 60.
    target_level : str
        Seniority target — 'fresher' | 'junior' | 'mid' | 'senior'.
        Default 'fresher' for campus / C2C context.
    max_age_days : int
        Maximum posting age in days; older posts are rejected. Default 14.

    Returns
    -------
    dict
        {accepted: bool, score: int, reason: str, tags: list[str]}
    """
    tags: list[str] = []
    deductions: list[str] = []
    base_score = 100  # start optimistic, deduct for failures

    text: str = clean_text(lead.get("text", "") or "")
    url: str = lead.get("url", "") or ""
    posted_date_str: Optional[str] = lead.get("posted_date")

    # ── 1. URL presence ────────────────────────────────────────────────────
    if not url or not url.startswith("http"):
        base_score -= 20
        deductions.append("no_url")
        tags.append("no_url")

    # ── 2. Text length ─────────────────────────────────────────────────────
    if len(text) < 140:
        base_score -= 25
        deductions.append("text_too_short")
        tags.append("text_too_short")

    # ── 3. Red flags (India-specific + universal) ──────────────────────────
    if RED_FLAG_TERMS.search(text):
        base_score -= 40
        deductions.append("red_flag_terms")
        tags.append("red_flag")

    # ── 4. Freshness ───────────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    parsed_date = _parse_date(posted_date_str)
    if parsed_date:
        age_days = (now - parsed_date).days
        if age_days > max_age_days:
            base_score -= 20
            deductions.append(f"stale_posting ({age_days}d old)")
            tags.append("stale")
        else:
            tags.append("fresh")
    else:
        # No date = uncertain freshness; mild deduction
        base_score -= 5
        tags.append("no_date")

    # ── 5. Signal quality from text ────────────────────────────────────────
    sq = compute_signal_quality(text)
    sq_score: int = sq.get("score", 0)
    tags.extend(sq.get("tags", []))

    # Blend: gate score × 0.6 + signal_quality × 0.4
    blended_score = int(base_score * 0.6 + sq_score * 0.4)

    # ── 6. Seniority fit ───────────────────────────────────────────────────
    seniority_note = ""
    lvl_pat = _TARGET_LEVEL_VOCAB.get(target_level.lower(), _FRESHER_SIGNALS)
    senior_hit = bool(_SENIOR_SIGNALS.search(text))
    target_hit = bool(lvl_pat.search(text))

    if target_level == "fresher" and senior_hit and not target_hit:
        blended_score -= 15
        seniority_note = "senior role mismatch for fresher target"
        tags.append("seniority_mismatch")
    elif not target_hit:
        # Neutral — no explicit match but no disqualifier either
        tags.append("seniority_unspecified")

    # ── 7. Final gate ──────────────────────────────────────────────────────
    final_score = max(0, min(100, blended_score))
    accepted = final_score >= min_quality

    if deductions:
        reason = "Failed checks: " + "; ".join(deductions)
        if seniority_note:
            reason += f"; {seniority_note}"
    elif accepted:
        reason = sq.get("reason", "Passed quality gate")
    else:
        reason = f"Score {final_score} below threshold {min_quality}"

    return {
        "accepted": accepted,
        "score": final_score,
        "reason": reason,
        "tags": list(dict.fromkeys(tags)),  # deduplicate preserving order
    }
