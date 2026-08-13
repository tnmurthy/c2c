"""Skill/stack normalization: parsing free-text skill lists into canonical names.

Handles splitting comma/bullet/slash separated skill strings, matching against
the canonical skill taxonomy, and filtering out noise (repo metadata, action
sentences, generic terms) that isn't actually a skill.
"""

from __future__ import annotations

import re
from typing import Any

# Canonical skill alias map now lives in the data layer so non-profile layers
# (e.g. data/graph/connection.py) can use it without crossing import boundaries.
# Re-exported here for backward compatibility with existing call sites.
from data.skill_taxonomy import SKILL_CANONICAL

from .constants import ACTION_SENTENCE_RE, GENERIC_SKILL_DENYLIST, REPO_METADATA_SKILL_RE
from .text_utils import _clean_inline_text, _dedupe, _is_section_or_noise, _key

__all__ = ["SKILL_CANONICAL", "normalize_skills", "normalize_stack", "split_skill_names"]


def normalize_skills(raw_items: list[Any]) -> list[dict[str, str]]:
    from .text_utils import _as_dict

    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for raw in raw_items:
        item = _as_dict(raw)
        value = item.get("name", item.get("n", raw if isinstance(raw, str) else ""))
        category = _clean_inline_text(item.get("category", item.get("cat", "general"))) or "general"
        for skill in split_skill_names(str(value or "")):
            if not _valid_skill(skill):
                continue
            key = _key(skill)
            if key in seen:
                continue
            seen.add(key)
            out.append({"name": skill, "category": category})
    return out[:100]


def split_skill_names(value: str) -> list[str]:
    clean = _clean_inline_text(re.sub(r"^[A-Za-z /&+-]{2,35}:\s*", "", value or ""))
    if not clean:
        return []
    if ACTION_SENTENCE_RE.search(clean) and len(clean.split()) > 5:
        return []
    clean = clean.replace("•", ",").replace("|", ",").replace(";", ",")
    parts = [_clean_skill_token(part) for part in re.split(r",|\n|/", clean) if _clean_skill_token(part)]
    if len(parts) == 1:
        compact_hits = _known_skill_hits(parts[0])
        if len(compact_hits) >= 2:
            return compact_hits
    out: list[str] = []
    for part in parts:
        known_hits = _known_skill_hits(part)
        if len(known_hits) >= 2 and len(part.split()) > 2:
            out.extend(known_hits)
        else:
            out.append(_canonical_skill(part))
    return _dedupe(out)


def normalize_stack(value: Any) -> list[str]:
    raw_parts = value if isinstance(value, list) else re.split(r",|;|\||/", str(value or ""))
    out: list[str] = []
    for raw in raw_parts:
        out.extend(split_skill_names(str(raw)))
    return [skill for skill in _dedupe(out) if _valid_skill(skill)]


def _valid_skill(skill: str) -> bool:
    from .education import _education_detail

    clean = _clean_inline_text(skill)
    lower = clean.lower()
    if not clean or len(clean) > 60 or "@" in clean or "http" in lower:
        return False
    if REPO_METADATA_SKILL_RE.search(clean):
        return False
    if lower in GENERIC_SKILL_DENYLIST:
        return False
    if _is_section_or_noise(clean) or _education_detail(clean):
        return False
    if len(clean.split()) > 5:
        return False
    if len(clean.split()) > 2 and _known_skill_hits(clean) and _key(clean) not in _known_skill_key_set():
        return False
    if len(clean.split()) == 1 and lower == clean and _key(clean) not in _known_skill_key_set():
        return False
    return not ACTION_SENTENCE_RE.search(clean)


def _known_skill_hits(text: str) -> list[str]:
    compact = re.sub(r"[^a-z0-9]+", "", text.lower())
    hits: list[str] = []
    for raw, canonical in sorted(SKILL_CANONICAL.items(), key=lambda pair: len(pair[0]), reverse=True):
        key = re.sub(r"[^a-z0-9]+", "", raw.lower())
        if len(key) < 2:
            continue
        if re.search(r"(?<![a-z0-9+#.-])" + re.escape(raw) + r"(?![a-z0-9+#.-])", text, re.I) or (len(key) > 2 and key in compact):
            hits.append(canonical)
    return _dedupe(hits)


def _known_skill_key_set() -> set[str]:
    return {_key(item) for item in [*SKILL_CANONICAL.keys(), *SKILL_CANONICAL.values()] if _key(item)}


def _canonical_skill(value: str) -> str:
    clean = _clean_skill_token(value)
    return SKILL_CANONICAL.get(clean.lower(), clean)


def _clean_skill_token(value: str) -> str:
    clean = _clean_inline_text(value)
    clean = re.sub(r"^[^\w+#.]+|[^\w+#.]+$", "", clean)
    return SKILL_CANONICAL.get(clean.lower(), clean)
