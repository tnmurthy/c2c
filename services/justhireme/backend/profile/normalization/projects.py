"""Project entry normalization: titles, repo URLs, stack detection, and
merging stray detail/stack-cluster lines into the preceding project."""

from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import unquote, urlparse

from .constants import ACTION_SENTENCE_RE, EMAIL_RE, GENERIC_PROJECT_TITLE_FRAGMENTS, NON_PROJECT_TITLES, URL_RE
from .education import _education_detail
from .skills import SKILL_CANONICAL, _known_skill_hits, _known_skill_key_set, normalize_stack, split_skill_names
from .text_utils import _as_dict, _clean_inline_text, _dedupe, _is_section_or_noise, _join_detail, _key, _stack_list

# normalize_stack lives in skills.py; re-exported here for backward
# compatibility since callers previously imported it alongside project helpers.
__all__ = ["normalize_projects", "normalize_stack"]


def _short_project_title(text: str) -> str:
    """Salvage a concise project title from a longer detail/sentence string."""
    base = _clean_inline_text(str(text or ""))
    base = re.split(r"[.\n;:|]", base)[0].strip(" -*•")
    words = base.split()
    return " ".join(words[:8]) if words else ""


def normalize_projects(raw_items: list[Any], *, known_skills: list[str] | None = None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    known = {_key(skill) for skill in (known_skills or [])}
    for raw in raw_items:
        item = _as_dict(raw)
        raw_title = str(item.get("title") or item.get("name") or item.get("n") or "")
        raw_impact = str(item.get("impact") or item.get("description") or "")
        repo = _clean_repo_url(str(item.get("repo") or item.get("url") or "") or _first_url(f"{raw_title} {raw_impact}"))
        title = _clean_project_title(raw_title)
        impact = _clean_project_detail(raw_impact)
        stack_items = normalize_stack(item.get("stack", item.get("s", "")))
        url_prefix = _prefix_before_first_url(raw_impact)
        if url_prefix and len(url_prefix.split()) <= 6 and _known_skill_hits(url_prefix):
            stack_items = _dedupe(stack_items + split_skill_names(url_prefix))
            impact = _clean_inline_text(impact.replace(_clean_inline_text(url_prefix), "", 1)).strip(" |:-")

        if not _valid_project_title(title, known):
            repo_title = _repo_title_from_url(repo)
            if repo_title and _valid_project_title(repo_title, known):
                title = repo_title

        if impact and _looks_like_skill_only_text(impact):
            stack_items = _dedupe(stack_items + split_skill_names(impact))
            impact = ""

        # A project with its own repo, a real stack, or a substantial impact
        # paragraph is a standalone project, not a continuation line — never
        # absorb it into the previous entry or drop it for a detail-like title.
        # This is what caused genuine projects to go missing during ingest.
        has_substance = bool(repo) or len(stack_items) >= 2 or len(impact.split()) >= 8

        if _looks_like_stack_cluster(title) and not has_substance:
            if out:
                merged_stack = _dedupe(_stack_list(out[-1].get("stack")) + split_skill_names(title) + stack_items)
                out[-1]["stack"] = ", ".join(merged_stack)
            continue

        if _looks_like_project_detail(title) and not has_substance:
            if out:
                detail = impact or title
                if detail:
                    out[-1]["impact"] = _join_detail(out[-1].get("impact", ""), detail)
                if stack_items:
                    out[-1]["stack"] = ", ".join(_dedupe(_stack_list(out[-1].get("stack")) + stack_items))
            continue

        if not _valid_project_title(title, known):
            repo_title = _repo_title_from_url(repo)
            if repo_title and _valid_project_title(repo_title, known):
                title = repo_title
            elif has_substance:
                # Keep the project; salvage a concise title from its first clause.
                title = _short_project_title(title) or _short_project_title(impact) or title
            else:
                continue

        if not (impact or repo or stack_items or _projectish_title(title)):
            continue

        key = _key(repo or title)
        if key in seen:
            continue
        seen.add(key)

        cleaned = {
            **item,
            "title": title,
            "stack": ", ".join(_dedupe(stack_items)),
            "repo": repo,
            "impact": impact,
        }
        out.append(cleaned)
    return out[:80]


def _valid_project_title(title: str, known_skills: set[str]) -> bool:
    if not title or len(title) > 120:
        return False
    lower = title.lower().strip(" :-")
    lower_key = _key(lower)
    if URL_RE.search(title) or EMAIL_RE.search(title):
        return False
    if lower in GENERIC_PROJECT_TITLE_FRAGMENTS or lower_key in {_key(item) for item in GENERIC_PROJECT_TITLE_FRAGMENTS}:
        return False
    if lower in NON_PROJECT_TITLES or _is_section_or_noise(title) or _education_detail(title):
        return False
    if _key(title) in known_skills or _key(title) in {_key(skill) for skill in SKILL_CANONICAL.values()}:
        return False
    words = title.split()
    if len(words) > 10:
        return False
    return not ACTION_SENTENCE_RE.search(title)


def _projectish_title(title: str) -> bool:
    return bool(re.search(r"\b(app|agent|api|dashboard|engine|framework|interface|interviewer|platform|pipeline|system|tool|workbench)\b", title, re.I))


def _looks_like_project_detail(title: str) -> bool:
    clean = _clean_inline_text(title)
    if not clean:
        return False
    if ACTION_SENTENCE_RE.search(clean):
        return True
    if clean[:1].islower() and not _projectish_title(clean):
        return True
    if re.match(r"(?i)^(and|or|with|without|while|history|tion|negotiation,|repetition\b)\b", clean):
        return True
    if clean.startswith(("-", "*", "•")):
        return True
    if len(clean.split()) > 9 and re.search(r"[.!?]$", clean):
        return True
    return bool(re.search(r"(?i)\b(summary|description|highlights?|features?|tech stack|stack)\s*:", clean))


def _looks_like_stack_cluster(title: str) -> bool:
    clean = _clean_inline_text(title)
    if not clean or len(clean) > 120:
        return False
    hits = _known_skill_hits(clean)
    return bool(len(hits) >= 2 and (len(clean.split()) <= 8 or re.search(r"[A-Za-z]\.[A-Za-z]|[a-z][A-Z]", clean)))


def _looks_like_skill_only_text(text: str) -> bool:
    clean = _clean_inline_text(text)
    if not clean:
        return False
    if _looks_like_stack_cluster(clean):
        return True
    return _key(clean) in _known_skill_key_set()


def _projectish_text(text: str) -> bool:
    return bool(re.search(r"\b(project|app|dashboard|platform|agent|pipeline|automation|api|tool|built|shipped)\b", text, re.I))


def _clean_project_title(title: str) -> str:
    clean = _clean_inline_text(re.sub(r"^\d+\s*[.)/-]*\s*", "", title or ""))
    clean = URL_RE.sub("", clean)
    clean = re.sub(r"(?i)\b(?:github|repo|repository|live|demo|source code)\s*:\s*$", "", clean)
    clean = re.sub(r"(?i)^(featured|selected)\s+(project|projects|work|case study)\s*[:|-]?\s*", "", clean).strip()
    clean = re.split(r"\s+(?:\|\s*)?(?:https?://|www\.)", clean, maxsplit=1, flags=re.I)[0]
    return clean.strip(" :-|.,")


def _clean_project_detail(value: str) -> str:
    clean = _clean_inline_text(value)
    clean = URL_RE.sub("", clean)
    clean = re.sub(r"(?i)\b(?:github|repo|repository|live|demo|source code|certificate link)\s*:?\s*$", "", clean)
    return _clean_inline_text(clean).strip(" :-|")


def _first_url(value: str) -> str:
    match = URL_RE.search(value or "")
    return match.group(0).rstrip(".,;") if match else ""


def _prefix_before_first_url(value: str) -> str:
    match = URL_RE.search(value or "")
    if not match:
        return ""
    return _clean_inline_text(str(value or "")[:match.start()]).strip(" |:-")


def _clean_repo_url(value: str) -> str:
    url = _first_url(value) or _clean_inline_text(value)
    if not url:
        return ""
    if url.lower().startswith("www."):
        url = "https://" + url
    return url.rstrip(".,;)")


def _repo_title_from_url(url: str) -> str:
    if not url:
        return ""
    try:
        parsed = urlparse(url if "://" in url else f"https://{url}")
    except Exception as log_exc:
        logging.getLogger(__name__).warning('suppressed exception in backend/profile/normalization/projects.py:_repo_title_from_url: %s', log_exc)
        return ""
    if "github.com" not in parsed.netloc.lower():
        return ""
    parts = [unquote(part).strip() for part in parsed.path.split("/") if part.strip()]
    if len(parts) < 2:
        return ""
    name = re.sub(r"\.git$", "", parts[1], flags=re.I)
    return _clean_inline_text(name.replace("-", " ").replace("_", " ")).strip(" .:-")
