"""Generic text-cleaning helpers shared across every normalization submodule.

These functions have no domain-specific knowledge (skills, education, etc.) —
they operate on raw strings/dicts and are composed by the more specific
normalizers in this package.
"""

from __future__ import annotations

import re
from typing import Any

from .constants import SECTION_TITLES


def _as_dict(value: Any) -> dict[str, Any]:
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return dict(value) if isinstance(value, dict) else {}


def _entry_title(value: Any) -> str:
    item = _as_dict(value)
    if item:
        return _clean_inline_text(str(item.get("title") or item.get("name") or item.get("n") or ""))
    return _clean_inline_text(str(value or ""))


def _stack_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [_clean_inline_text(str(item)) for item in value if _clean_inline_text(str(item))]
    return [_clean_inline_text(part) for part in str(value or "").split(",") if _clean_inline_text(part)]


def _append_detail(base: str, detail: str) -> str:
    from .education import _education_detail

    detail = _clean_inline_text(detail)
    if not detail or detail.lower() in base.lower():
        return base
    separator = ", " if _education_detail(detail) else " - "
    return f"{base}{separator}{detail}"


def _join_detail(base: str, detail: str) -> str:
    base = _clean_inline_text(base)
    detail = _clean_inline_text(detail)
    if not base:
        return detail
    if not detail or detail.lower() in base.lower():
        return base
    return f"{base}\n{detail}"


def _is_section_or_noise(text: str) -> bool:
    clean = _clean_inline_text(text).lower().strip(" :-")
    if not clean or clean in SECTION_TITLES:
        return True
    if re.fullmatch(r"\d+[\d,.]*(?:%|x|k)?", clean):
        return True
    return bool(re.search(r"\b(show all|view all|open|menu|close|copyright|privacy)\b", clean))


def _clean_inline_text(value: str) -> str:
    value = re.sub(r"`([^`]+)`", r"\1", value or "")
    value = re.sub(r"\*\*([^*]+)\*\*", r"\1", value)
    value = re.sub(r"\*([^*]+)\*", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"^\s*[-*•]\s*", "", value)
    value = re.sub(r"\b([A-Z]\.[A-Z])\s+([a-z]{2,})\b", r"\1\2", value)
    value = re.sub(r"\b([A-Z])\.\s+([A-Za-z]{2,})\b", r"\1.\2", value)
    value = re.sub(r"\b([BFV])\s+([a-z]{2,})\b", r"\1\2", value)
    return re.sub(r"\s+", " ", value).strip()


def _key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        clean = _clean_inline_text(value)
        key = clean.lower()
        if clean and key not in seen:
            seen.add(key)
            out.append(clean)
    return out
