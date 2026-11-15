"""Seeded/demo students (students.is_synthetic, ADR-002) stay out of anything an
employer, matcher, CRM user or partner sees — unless a demo environment opts in.

  SHOW_SYNTHETIC_STUDENTS=true   include them (sales demos, staging). Default: excluded.
"""
import os


def include_synthetic() -> bool:
    return os.environ.get("SHOW_SYNTHETIC_STUDENTS", "").strip().lower() == "true"


def real_students_only(query):
    """Apply to a supabase `students` select query."""
    return query if include_synthetic() else query.eq("is_synthetic", False)
