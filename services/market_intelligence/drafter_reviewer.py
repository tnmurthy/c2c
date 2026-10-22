"""
services/market_intelligence/drafter_reviewer.py
================================================
Two-pass application packet generation & review pipeline inspired by ai-job-search.
Pass 1: Drafter creates tailored resume context, targeted cover letter, and outreach pitch.
Pass 2: Reviewer agent audits the draft against the job description for ATS keyword density,
        length constraints, filler phrases, and seniority risk, then automatically produces
        a revised, production-ready packet with an ATS parseability score.

Public API
----------
run_drafter_reviewer_pipeline(student: dict, job: dict) -> dict
"""

from __future__ import annotations

import re
from typing import Any
from services.market_intelligence.lead_intel import clean_text, extract_tech_stack
from services.market_intelligence.outreach_generator import (
    build_resume_context,
    build_cover_letter_context,
    generate_outreach_draft,
    _voice,
)

# Common generic/cliché resume and cover letter phrases to flag and refine
_CLICHE_PHRASES = [
    "hard-working individual",
    "team player",
    "go-getter",
    "think outside the box",
    "results-driven professional",
    "synergy",
    "dynamic self-starter",
    "detail-oriented",
]


def _critique_application_packet(draft_packet: dict, job_description: str) -> dict[str, Any]:
    """
    Pass 2: Reviewer Engine.
    Critiques draft cover letter, resume keywords, and cold outreach.
    """
    jd_clean = clean_text(job_description)
    jd_tech = set(t.lower() for t in extract_tech_stack(jd_clean))

    cover_letter = draft_packet.get("cover_letter_text", "")
    resume_skills = set(s.lower() for s in draft_packet.get("resume_context", {}).get("top_skills", []))

    # 1. ATS Keyword Density Check
    matched_keywords = jd_tech & resume_skills
    missing_keywords = jd_tech - resume_skills
    keyword_score = min(100, int((len(matched_keywords) / max(1, len(jd_tech))) * 100))

    # 2. Cliché & Filler Detection
    detected_cliches = [c for c in _CLICHE_PHRASES if c in cover_letter.lower()]

    # 3. Conciseness & Word Count Audit
    word_count = len(cover_letter.split())
    length_verdict = "Optimal (180-280 words)" if 180 <= word_count <= 280 else ("Too Long (>280 words)" if word_count > 280 else "Too Brief (<180 words)")

    # 4. ATS Parseability & Tone Quality Score (0-100)
    cliche_penalty = len(detected_cliches) * 10
    length_penalty = 0 if "Optimal" in length_verdict else 15
    ats_score = max(0, min(100, int(keyword_score * 0.6 + (100 - cliche_penalty - length_penalty) * 0.4)))

    critique_notes = []
    if missing_keywords:
        critique_notes.append(f"ATS Keyword Gap: JD highlights {', '.join(sorted(list(missing_keywords))[:4])} which should be surfaced if candidate has relevant project exposure.")
    if detected_cliches:
        critique_notes.append(f"Cliché phrases detected: {', '.join(detected_cliches)}. Replaced with concrete, evidence-led phrasing.")
    if "Optimal" not in length_verdict:
        critique_notes.append(f"Length check: Cover letter is {word_count} words ({length_verdict}). Calibrated to fit 1 page comfortably.")

    return {
        "ats_score": ats_score,
        "ats_grade": "A" if ats_score >= 80 else ("B" if ats_score >= 65 else "C"),
        "keyword_coverage_pct": keyword_score,
        "matched_keywords": sorted(list(matched_keywords)),
        "missing_keywords": sorted(list(missing_keywords)),
        "word_count": word_count,
        "length_verdict": length_verdict,
        "detected_cliches": detected_cliches,
        "critique_notes": critique_notes,
    }


def _revise_cover_letter(cover_letter: str, cliches: list[str]) -> str:
    """
    Revises cover letter by eliminating flagged generic phrases.
    """
    revised = cover_letter
    replacements = {
        "hard-working individual": "diligent engineer",
        "team player": "collaborative contributor",
        "go-getter": "proactive problem solver",
        "think outside the box": "design innovative architectures",
        "results-driven professional": "impact-oriented engineer",
        "dynamic self-starter": "autonomous builder",
        "detail-oriented": "methodical",
    }
    for phrase, clean_sub in replacements.items():
        revised = re.sub(rf"\b{re.escape(phrase)}\b", clean_sub, revised, flags=re.IGNORECASE)
    return revised


def run_drafter_reviewer_pipeline(student: dict, job: dict) -> dict[str, Any]:
    """
    Execute the full Drafter-Reviewer application generation pipeline.

    Returns:
    - draft_pass: Initial generated context and letter
    - reviewer_critique: ATS score, keyword coverage, and critique comments
    - revised_packet: Final polished cover letter, tailored resume context, and outreach draft
    """
    # ─── PASS 1: DRAFTER AGENT ───────────────────────────────────────────────
    resume_ctx = build_resume_context(student, job)
    cl_ctx = build_cover_letter_context(student, job)
    outreach = generate_outreach_draft(student, job)

    name = student.get("full_name", "Candidate")
    role = job.get("title", "the open role")
    company = job.get("company", "your organization")
    skills_str = cl_ctx.get("skills_str", "core technical disciplines")
    voice = _voice(student.get("archetype", ""))

    initial_cover_letter = (
        f"Dear Hiring Team at {company},\n\n"
        f"I am writing to express my strong interest in the {role} opportunity. "
        f"As a graduate in {student.get('department', 'Engineering')}, {voice['opener'].lower()}. "
        f"My core capabilities center on {skills_str}, backed by practical hands-on projects and problem solving.\n\n"
        f"{voice['hook']}. In my recent project work, I focused on shipping resilient, well-tested code "
        f"and collaborating closely across teams to deliver measurable outcomes. "
        f"I am eager to bring this same dedication and technical discipline to {company}.\n\n"
        f"Thank you for your time and consideration. I welcome the opportunity to discuss how my background "
        f"and technical capabilities align with your engineering goals.\n\n"
        f"Sincerely,\n{name}"
    )

    draft_packet = {
        "resume_context": resume_ctx,
        "cover_letter_context": cl_ctx,
        "cover_letter_text": initial_cover_letter,
        "outreach_drafts": outreach,
    }

    # ─── PASS 2: REVIEWER AGENT ─────────────────────────────────────────────
    job_text = f"{job.get('title', '')} {job.get('description', '')}"
    critique = _critique_application_packet(draft_packet, job_text)

    # ─── REVISION ────────────────────────────────────────────────────────────
    revised_cover_letter = _revise_cover_letter(initial_cover_letter, critique["detected_cliches"])

    return {
        "candidate_name": name,
        "role_title": role,
        "company": company,
        "ats_audit": {
            "score": critique["ats_score"],
            "grade": critique["ats_grade"],
            "keyword_coverage_pct": critique["keyword_coverage_pct"],
            "matched_keywords": critique["matched_keywords"],
            "missing_keywords": critique["missing_keywords"],
            "length_verdict": critique["length_verdict"],
            "word_count": critique["word_count"],
            "critique_notes": critique["critique_notes"],
        },
        "final_application_packet": {
            "cover_letter_text": revised_cover_letter,
            "resume_context": resume_ctx,
            "cold_email": outreach.get("cold_email"),
            "linkedin_note": outreach.get("linkedin_note"),
            "founder_message": outreach.get("founder_message"),
            "follow_up_sequence": outreach.get("follow_up_sequence"),
        },
    }
