"""Candidate identity normalization: cleaning extracted name and summary text."""

from __future__ import annotations

import re
from typing import Any

from .constants import EMAIL_RE, PHONE_RE, URL_RE
from .text_utils import _as_dict, _clean_inline_text

__all__: list[str] = []


def _normalize_candidate(raw: Any) -> dict[str, str]:
    item = _as_dict(raw)
    name = _clean_name(str(item.get("name") or item.get("n") or ""))
    summary = _clean_summary(str(item.get("summary") or item.get("s") or ""))
    return {"name": name, "summary": summary}


def _clean_name(value: str) -> str:
    clean = _clean_inline_text(re.sub(r"(?i)^name\s*:\s*", "", value or ""))
    clean = re.split(r"\s+[|–—-]\s+", clean, maxsplit=1)[0].strip()
    role_match = re.search(
        r"\b(?:full[- ]?stack|software|frontend|backend|ai|ml|data)?\s*"
        r"(?:engineer|developer|designer|architect|student|intern)\b",
        clean,
        re.I,
    )
    if role_match:
        if role_match.start() == 0:
            return ""
        clean = clean[:role_match.start()].strip(" |-")
    if "@" in clean or "http" in clean.lower():
        return ""
    words = clean.split()
    if not (1 <= len(words) <= 5):
        return ""
    lower = clean.lower()
    if any(term in lower for term in ("portfolio", "resume", "developer", "engineer", "student")) and len(words) <= 2:
        return ""
    if not re.search(r"[A-Za-z]", clean):
        return ""
    return clean


def _clean_summary(value: str) -> str:
    lines: list[str] = []
    for raw_line in str(value or "").splitlines():
        line = _clean_inline_text(raw_line)
        if not line:
            continue
        lower = line.lower().strip(" :-")
        if lower.startswith(("email", "phone", "mobile", "links", "linkedin", "github", "portfolio", "website", "contact")):
            continue
        if lower.startswith(("targeting ", "applying to ", "job url", "url")):
            continue
        line = URL_RE.sub("", line)
        line = EMAIL_RE.sub("", line)
        line = PHONE_RE.sub("", line)
        line = _clean_inline_text(line).strip(" .;|-")
        if line:
            lines.append(line)
    clean = _clean_inline_text(" ".join(lines))
    if not clean:
        return ""
    marker_count = sum(1 for marker in ("email", "phone", "links", "linkedin", "github", "http") if marker in clean.lower())
    if marker_count >= 2:
        return ""
    if len(clean.split()) < 4 and not re.search(r"\b(engineer|developer|student|designer|analyst|scientist|builder|architect)\b", clean, re.I):
        return ""
    return clean[:900]
