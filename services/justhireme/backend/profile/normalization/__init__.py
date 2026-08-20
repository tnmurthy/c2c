"""Profile field normalization.

Originally a single ~825-line module; split into focused submodules by
concern (candidate identity, skills, experience, projects, education,
text-entry lists like certifications/achievements) while keeping every
public symbol importable from ``profile.normalization`` exactly as before,
e.g. ``from profile.normalization import normalize_profile_payload``.
"""

from __future__ import annotations

from .education import normalize_education_entries
from .experience import normalize_experiences
from .payload import normalize_candidate_model, normalize_profile_payload
from .projects import normalize_projects, normalize_stack
from .skills import SKILL_CANONICAL, normalize_skills, split_skill_names
from .text_entries import normalize_text_entries

__all__ = [
    "SKILL_CANONICAL",
    "normalize_candidate_model",
    "normalize_education_entries",
    "normalize_experiences",
    "normalize_profile_payload",
    "normalize_projects",
    "normalize_skills",
    "normalize_stack",
    "normalize_text_entries",
    "split_skill_names",
]
