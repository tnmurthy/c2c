"""
services/market_intelligence/profile_expander.py
================================================
Profile expansion service inspired by ai-job-search /expand.
Enriches candidate profiles by scanning public GitHub repositories, portfolios,
and links to discover inferred competencies, languages, frameworks, and topics.

Public API
----------
expand_github_profile(github_url_or_handle: str) -> dict
expand_candidate_profile(student_profile: dict) -> dict
"""

from __future__ import annotations

import re
import urllib.request
import json
import logging
from typing import Any

logger = logging.getLogger("c2c_api.profile_expander")

# Mapping of GitHub repo topics and languages to standardized skill badges
_LANGUAGE_MAP = {
    "python": "Python",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "rust": "Rust",
    "go": "Go",
    "java": "Java",
    "c++": "C++",
    "c#": "C#",
    "html": "HTML5",
    "css": "CSS3",
    "solidity": "Solidity",
    "dart": "Dart",
    "kotlin": "Kotlin",
    "swift": "Swift",
}

_TOPIC_SKILL_MAP = {
    "react": "React",
    "nextjs": "Next.js",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "vue": "Vue.js",
    "angular": "Angular",
    "tailwindcss": "Tailwind CSS",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "supabase": "Supabase",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "graphql": "GraphQL",
    "aws": "AWS",
    "ai": "AI/ML",
    "llm": "LLMs",
    "rag": "RAG",
    "langchain": "LangChain",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "scikit-learn": "Scikit-Learn",
    "machine-learning": "Machine Learning",
    "deep-learning": "Deep Learning",
    "nlp": "NLP",
}


def _extract_github_handle(url_or_handle: str) -> str:
    raw = str(url_or_handle or "").strip().rstrip("/")
    if not raw:
        return ""
    # Matches https://github.com/username or github.com/username or @username or username
    match = re.search(r"(?:github\.com/|@|^)([a-zA-Z0-9-]+)(?:/.*)?$", raw)
    if match:
        return match.group(1)
    return raw


def expand_github_profile(github_url_or_handle: str) -> dict[str, Any]:
    """
    Query public GitHub user and repository data without authentication.
    Returns discovered languages, top topics, total public repos, and inferred skills.
    """
    handle = _extract_github_handle(github_url_or_handle)
    if not handle:
        return {"error": "Invalid GitHub username or URL", "inferred_skills": []}

    headers = {
        "User-Agent": "C2C-CampusToCorporate-ProfileExpander/1.0",
        "Accept": "application/vnd.github.v3+json",
    }

    discovered_skills: set[str] = set()
    repo_summaries: list[dict[str, Any]] = []
    languages_count: dict[str, int] = {}

    try:
        # Fetch public user info
        user_url = f"https://api.github.com/users/{handle}"
        req = urllib.request.Request(user_url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            user_data = json.loads(response.read().decode())
    except Exception as e:
        logger.warning(f"Could not fetch GitHub user {handle}: {e}")
        user_data = {"login": handle}

    try:
        # Fetch public repositories (up to 30)
        repos_url = f"https://api.github.com/users/{handle}/repos?sort=pushed&per_page=30"
        req = urllib.request.Request(repos_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            repos_data = json.loads(response.read().decode())

        if isinstance(repos_data, list):
            for repo in repos_data:
                lang = repo.get("language")
                if lang:
                    norm_lang = _LANGUAGE_MAP.get(lang.lower(), lang)
                    discovered_skills.add(norm_lang)
                    languages_count[norm_lang] = languages_count.get(norm_lang, 0) + 1

                topics = repo.get("topics") or []
                for topic in topics:
                    norm_topic = _TOPIC_SKILL_MAP.get(topic.lower())
                    if norm_topic:
                        discovered_skills.add(norm_topic)

                desc = repo.get("description") or ""
                # Also check description for key tech terms
                desc_lower = desc.lower()
                for key, mapped in _TOPIC_SKILL_MAP.items():
                    if re.search(rf"\b{re.escape(key)}\b", desc_lower):
                        discovered_skills.add(mapped)

                repo_summaries.append({
                    "name": repo.get("name"),
                    "stars": repo.get("stargazers_count", 0),
                    "forks": repo.get("forks_count", 0),
                    "language": lang,
                    "description": desc[:140] if desc else "",
                    "url": repo.get("html_url"),
                })

    except Exception as e:
        logger.warning(f"Could not fetch repos for {handle}: {e}")

    top_languages = sorted(languages_count.keys(), key=lambda k: languages_count[k], reverse=True)[:5]

    return {
        "handle": handle,
        "name": user_data.get("name") or handle,
        "bio": user_data.get("bio") or "",
        "public_repos": user_data.get("public_repos", len(repo_summaries)),
        "inferred_skills": sorted(list(discovered_skills)),
        "top_languages": top_languages,
        "repo_highlights": sorted(repo_summaries, key=lambda r: r["stars"], reverse=True)[:5],
        "confidence_level": "High" if len(repo_summaries) >= 3 else ("Moderate" if repo_summaries else "Low"),
    }


def expand_candidate_profile(student_profile: dict) -> dict:
    """
    Perform multi-source profile expansion on an existing candidate profile.
    Merges existing skills with newly discovered public skills, flagging additions.
    """
    existing_skills = set(student_profile.get("skills") or [])
    github_url = student_profile.get("github_url") or student_profile.get("github") or ""

    expansion_result = expand_github_profile(github_url)
    inferred = set(expansion_result.get("inferred_skills", []))

    new_discoveries = list(inferred - existing_skills)
    merged_skills = sorted(list(existing_skills | inferred))

    return {
        "candidate_id": student_profile.get("id"),
        "original_skills_count": len(existing_skills),
        "total_skills_count": len(merged_skills),
        "new_skills_discovered": new_discoveries,
        "all_merged_skills": merged_skills,
        "github_telemetry": expansion_result,
    }
