"""Certification and achievement list normalization: merging stray issuer/date
continuation lines into the preceding entry."""

from __future__ import annotations

import re
from typing import Any

from .constants import CERT_DATE_RE, CERTIFICATE_ISSUERS, URL_RE
from .education import _education_detail
from .skills import SKILL_CANONICAL
from .text_utils import _clean_inline_text, _dedupe, _entry_title, _is_section_or_noise, _key

__all__ = ["normalize_text_entries"]


def normalize_text_entries(raw_items: list[Any], *, kind: str) -> list[str]:
    out: list[str] = []
    for raw in raw_items:
        text = _entry_title(raw)
        if kind == "certification":
            text = _clean_certification_entry(text)
            if not text:
                continue
            if _is_cert_date_line(text) and out:
                out[-1] = _append_cert_detail(out[-1], _normalize_cert_date(text))
                continue
            if _is_cert_issuer_only(text) and out:
                out[-1] = _append_cert_issuer(out[-1], text)
                continue
        if not text or _is_section_or_noise(text):
            continue
        if kind == "achievement" and _education_detail(text):
            continue
        if len(text.split()) == 1 and _key(text) in {_key(skill) for skill in SKILL_CANONICAL.values()}:
            continue
        out.append(text)
    return _dedupe(out)[:30]


def _clean_certification_entry(value: str) -> str:
    clean = _clean_inline_text(value)
    clean = re.sub(r"(?i)\b(?:credential|certificate)\s+link\b", "", clean)
    clean = re.sub(r"(?i)\b(?:view|verify|open)\s+(?:credential|certificate)\b", "", clean)
    clean = URL_RE.sub("", clean)
    clean = re.sub(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)(\d{4})\b", r"\1 \2", clean, flags=re.I)
    clean = re.sub(r"\s*[-|]{2,}\s*", " - ", clean)
    clean = _clean_inline_text(clean).strip(" -:|")
    if not clean or clean.lower() in {"certificate", "certification", "certifications", "credential", "credentials", "link"}:
        return ""
    return clean


def _is_cert_date_line(text: str) -> bool:
    clean = _clean_inline_text(text)
    return bool(clean and CERT_DATE_RE.search(clean) and len(clean.split()) <= 7 and not re.search(r"[A-Za-z]{4,}", CERT_DATE_RE.sub("", clean)))


def _normalize_cert_date(text: str) -> str:
    clean = re.sub(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)(\d{4})\b", r"\1 \2", text, flags=re.I)
    return _clean_inline_text(clean)


def _is_cert_issuer_only(text: str) -> bool:
    lower = _clean_inline_text(text).lower()
    return lower in CERTIFICATE_ISSUERS or (len(lower.split()) <= 3 and lower in CERTIFICATE_ISSUERS)


def _append_cert_detail(base: str, detail: str) -> str:
    base = _clean_inline_text(base)
    detail = _clean_inline_text(detail)
    if not detail or detail.lower() in base.lower():
        return base
    return f"{base} {detail}".strip()


def _append_cert_issuer(base: str, issuer: str) -> str:
    base = _clean_inline_text(base)
    issuer = _clean_inline_text(issuer)
    if not issuer or issuer.lower() in base.lower():
        return base
    date_match = re.search(r"(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[A-Za-z]*\s+\d{4}\b.*)$", base, flags=re.I)
    if date_match:
        prefix = base[:date_match.start()].strip(" -")
        return f"{prefix} - {issuer} {date_match.group(1).strip()}".strip()
    return f"{base} - {issuer}"
