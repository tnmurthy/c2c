"""Work experience normalization: cleaning and de-duplicating job entries."""

from __future__ import annotations

from typing import Any

from .text_utils import _as_dict, _clean_inline_text, _dedupe, _key

__all__ = ["normalize_experiences"]


def normalize_experiences(raw_items: list[Any]) -> list[dict[str, Any]]:
    """Clean and de-duplicate work experiences.

    The same job is often extracted more than once (LLM pass + deterministic
    heuristic, or a single block re-emitted), producing duplicate entries with
    near-identical wording. De-duplicate on a normalized role+company key and
    keep the richest variant (longest description, filled period, merged skills)
    instead of repeating the role.
    """
    out: list[dict[str, Any]] = []
    index: dict[str, dict[str, Any]] = {}
    for raw in raw_items:
        item = _as_dict(raw)
        role = _clean_inline_text(str(item.get("role") or "")).strip()
        co = _clean_inline_text(str(item.get("company") or item.get("co") or "")).strip()
        if not role and not co:
            continue
        period = str(item.get("period") or "").strip()
        description = str(item.get("description") or item.get("d") or "").strip()
        skills = [str(s).strip() for s in (item.get("skills") or item.get("s") or []) if str(s).strip()]
        key = _key(f"{role} {co}")
        if not key:
            continue
        existing = index.get(key)
        if existing is not None:
            if len(description) > len(existing.get("description", "")):
                existing["description"] = description
            if not existing.get("period") and period:
                existing["period"] = period
            if skills:
                existing["skills"] = _dedupe([*(existing.get("skills") or []), *skills])
            continue
        entry = {"role": role, "company": co, "period": period, "description": description, "skills": skills}
        index[key] = entry
        out.append(entry)
    return out
