"""Education entry normalization: merging institution/degree/grade lines into
single, de-duplicated education entries."""

from __future__ import annotations

import re
from typing import Any

from .constants import DATE_RE, DEGREE_ANCHOR_RE, EDUCATION_ANCHOR_RE, GRADE_RE, INSTITUTION_ANCHOR_RE, LOCATION_WORDS
from .text_utils import _clean_inline_text, _dedupe, _entry_title, _is_section_or_noise, _key

__all__ = ["normalize_education_entries"]


def normalize_education_entries(raw_items: list[Any]) -> list[str]:
    from .text_utils import _append_detail

    lines: list[str] = []
    for raw in raw_items:
        text = _entry_title(raw)
        if not text:
            continue
        split = [_clean_inline_text(part) for part in re.split(r"\n+|(?:\s+-\s+)(?=(?:cgpa|gpa|grade|19|20|\d))", text) if _clean_inline_text(part)]
        lines.extend(split or [text])

    items: list[str] = []
    current = ""
    pending_details: list[str] = []

    for line in lines:
        if _is_section_or_noise(line):
            continue
        if _education_anchor(line):
            if current and _education_same_entry(current, line):
                current = _append_detail(current, line)
            else:
                if current:
                    items.append(current)
                current = _clean_inline_text(" ".join([line, *pending_details]))
                pending_details = []
            continue
        if _education_detail(line):
            if current:
                current = _append_detail(current, line)
            else:
                pending_details.append(line)
            continue
        if current and len(line.split()) <= 8:
            current = _append_detail(current, line)

    if current:
        items.append(current)
    return _dedupe([_clean_inline_text(item) for item in items if _valid_education_item(item)])[:20]


def _education_same_entry(current: str, line: str) -> bool:
    current_clean = _clean_inline_text(current)
    line_clean = _clean_inline_text(line)
    if not current_clean or not line_clean:
        return False
    current_key = _key(current_clean)
    line_key = _key(line_clean)
    if line_key and line_key in current_key:
        return True
    current_has_institution = bool(INSTITUTION_ANCHOR_RE.search(current_clean))
    current_has_degree = bool(DEGREE_ANCHOR_RE.search(current_clean))
    line_has_institution = bool(INSTITUTION_ANCHOR_RE.search(line_clean))
    line_has_degree = bool(DEGREE_ANCHOR_RE.search(line_clean))
    return (current_has_institution and line_has_degree and not line_has_institution) or (
        current_has_degree and line_has_institution and not current_has_institution
    )


def _education_anchor(line: str) -> bool:
    return bool(EDUCATION_ANCHOR_RE.search(line or ""))


def _education_detail(line: str) -> bool:
    clean = _clean_inline_text(line)
    lower = clean.lower().strip(" ,")
    if not clean:
        return False
    if lower in LOCATION_WORDS:
        return True
    if GRADE_RE.search(clean):
        return True
    return bool(DATE_RE.search(clean) and len(clean.split()) <= 6)


def _valid_education_item(item: str) -> bool:
    if not item or _is_section_or_noise(item):
        return False
    if _education_detail(item) and not _education_anchor(item):
        return False
    return _education_anchor(item)
