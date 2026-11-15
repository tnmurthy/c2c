"""Who employers, matching, CRM users and partners may see (ADR-002, M4-3).

Excluded unless a demo environment opts in:
  - seeded/demo students (students.is_synthetic)
  - students a college imported who have not signed up yet (no auth_id): they have
    not agreed to anything themselves, so they stay visible only to their college.

  SHOW_SYNTHETIC_STUDENTS=true   include both (sales demos, staging). Default: excluded.
"""
import os


def include_synthetic() -> bool:
    return os.environ.get("SHOW_SYNTHETIC_STUDENTS", "").strip().lower() == "true"


def real_students_only(query):
    """Apply to a supabase `students` select query used for anything employer-facing."""
    if include_synthetic():
        return query
    return query.eq("is_synthetic", False).filter("auth_id", "not.is", "null")
