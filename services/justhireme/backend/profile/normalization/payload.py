"""Top-level profile payload normalization: composes the field-level
normalizers into the full candidate-payload and candidate-model shapes."""

from __future__ import annotations

from typing import Any

from models.schema import C, E, P, S

from .candidate import _normalize_candidate
from .education import normalize_education_entries
from .experience import normalize_experiences
from .projects import normalize_projects
from .skills import normalize_skills
from .text_entries import normalize_text_entries
from .text_utils import _stack_list

__all__ = ["normalize_candidate_model", "normalize_profile_payload"]


def normalize_profile_payload(data: dict[str, Any]) -> dict[str, Any]:
    data = dict(data or {})
    candidate = _normalize_candidate(data.get("candidate") or data)
    identity = dict(data.get("identity") or {})
    skills = normalize_skills(data.get("skills") or [])
    experience = normalize_experiences(data.get("experience") or [])
    projects = normalize_projects(data.get("projects") or [], known_skills=[item["name"] for item in skills])
    education = normalize_education_entries(data.get("education") or [])
    certifications = normalize_text_entries(data.get("certifications") or data.get("certs") or [], kind="certification")
    achievements = normalize_text_entries(data.get("achievements") or data.get("awards") or [], kind="achievement")

    return {
        **data,
        "candidate": candidate,
        "identity": identity,
        "skills": skills,
        "experience": experience,
        "projects": projects,
        "education": [{"title": item} for item in education],
        "certifications": [{"title": item} for item in certifications],
        "achievements": [{"title": item} for item in achievements],
    }


def normalize_candidate_model(profile: C) -> C:
    payload = normalize_profile_payload({
        "candidate": {"name": profile.n, "summary": profile.s},
        "skills": [{"name": skill.n, "category": skill.cat} for skill in profile.skills],
        "experience": [
            {"role": exp.role, "company": exp.co, "period": exp.period, "description": exp.d, "skills": exp.s}
            for exp in profile.exp
        ],
        "projects": [
            {"title": project.title, "stack": project.stack, "repo": project.repo or "", "impact": project.impact}
            for project in profile.projects
        ],
        "education": profile.education,
        "certifications": profile.certifications,
        "achievements": profile.achievements,
    })
    clean_name = payload["candidate"].get("name", "")
    return C(
        n=clean_name or "Candidate",
        s=payload["candidate"].get("summary", "") or profile.s,
        skills=[S(n=item["name"], cat=item.get("category", "general")) for item in payload["skills"]],
        exp=[
            E(
                role=item.get("role", ""),
                co=item.get("company", ""),
                period=item.get("period", ""),
                d=item.get("description", ""),
                s=list(item.get("skills") or []),
            )
            for item in payload["experience"]
        ],
        projects=[
            P(
                title=item["title"],
                stack=_stack_list(item.get("stack")),
                repo=item.get("repo") or "",
                impact=item.get("impact", ""),
                s=_stack_list(item.get("stack")),
            )
            for item in payload["projects"]
        ],
        education=[item["title"] for item in payload["education"]],
        certifications=[item["title"] for item in payload["certifications"]],
        achievements=[item["title"] for item in payload["achievements"]],
    )
