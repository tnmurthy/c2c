"""
services/market_intelligence/interview_prep.py
==============================================
Template-based interview preparation sheet generator for C2C candidates.
Generates role-specific questions, STAR-framework response starters mapped
to student skills and psychometric archetype, and company research directives.
No external LLM or API keys required.

Public API
----------
generate_interview_prep(student: dict, job: dict) -> dict
"""

from __future__ import annotations

import re
from typing import Any, Optional
from services.market_intelligence.lead_intel import clean_text, extract_tech_stack, extract_location, extract_company

# ─── Question Banks & STAR templates ─────────────────────────────────────────

_TECH_QUESTIONS = {
    "python": "Can you walk us through a Python project where you handled performance bottlenecks or asynchronous processing?",
    "fastapi": "How do you structure API routers, dependency injection, and Pydantic validation in FastAPI?",
    "react": "How do you manage complex UI state, side-effects, and component memoization in modern React / Next.js?",
    "next.js": "Explain the difference between Server Components and Client Components in Next.js App Router.",
    "typescript": "How do you leverage TypeScript generics and utility types to ensure end-to-end type safety?",
    "sql": "How do you optimize slow database queries and design efficient composite indexes?",
    "postgresql": "Explain how you handle transactions, foreign keys, or Row Level Security (RLS) in PostgreSQL.",
    "docker": "Describe how you containerize multi-tier applications and optimize multi-stage Dockerfiles.",
    "aws": "Which AWS core services (S3, Lambda, EC2) have you worked with and how did you configure permissions/IAM?",
    "ai": "How do you evaluate hallucination risks and design deterministic fallback mechanisms when integrating AI/LLMs?",
    "rag": "Explain your approach to chunking, vector indexing, and embedding retrieval in a RAG pipeline.",
}

_ARCHETYPE_BEHAVIORAL_QUESTIONS = {
    "THE_BUILDER": {
        "question": "Tell us about a time you had to build a minimum viable prototype under tight time constraints.",
        "star_starter": "Situation: We had a short deadline for a project. Task: I was responsible for delivering the core backend/frontend architecture. Action: I scoped the essential features, selected modern tools, and built iteratively. Result: Delivered the working prototype on time with zero regressions.",
        "focus": "Hands-on execution, architecture ownership, pragmatism",
    },
    "LEADER": {
        "question": "Describe a scenario where you had to align conflicting viewpoints or coordinate team members during a milestone.",
        "star_starter": "Situation: Team members had divergent approaches to system design. Task: Establish consensus and maintain momentum. Action: Facilitated a technical trade-off review and delegated tasks based on strengths. Result: Shipped the release on schedule with high team morale.",
        "focus": "Clear communication, delegation, conflict resolution",
    },
    "ANCHOR": {
        "question": "Can you share an experience where you identified an overlooked bug, edge case, or process flaw and resolved it?",
        "star_starter": "Situation: A critical edge case was causing unexpected data inconsistency. Task: Root cause the issue and harden the pipeline. Action: Traced logs, wrote targeted unit tests, and added defensive validation. Result: Eliminated recurring failures and boosted system reliability.",
        "focus": "Reliability, thoroughness, quality assurance",
    },
}

_GENERAL_FRESHER_QUESTIONS = [
    {
        "question": "Walk us through your most impactful academic or personal project from inception to deployment.",
        "category": "Project Deep-Dive",
        "star_guide": "State the problem, highlight your specific contributions (languages, frameworks), and quantify the outcome.",
    },
    {
        "question": "How do you approach learning a completely new language or framework when assigned a project?",
        "category": "Adaptability & Growth",
        "star_guide": "Emphasize reading official docs, building quick spike prototypes, and applying AQ (Adaptability Quotient).",
    },
    {
        "question": "Tell us about a technical challenge or bug that stumped you and how you systematically debugged it.",
        "category": "Problem Solving",
        "star_guide": "Detail your methodical debugging steps: reproducing, isolating variables, inspecting network/logs, and verifying the fix.",
    },
]


# ─── Generator ───────────────────────────────────────────────────────────────

def generate_interview_prep(student: dict, job: dict) -> dict:
    """
    Generate an Interview Prep Sheet for a student applying to a job.

    Parameters
    ----------
    student : dict
        Keys: full_name, skills, department, target_roles, archetype, iq_score, eq_score, aq_score.
    job : dict
        Keys: title, description, company, location.

    Returns
    -------
    dict
        Structured interview prep guide with questions, STAR frameworks,
        recommended talking points, and company research checklist.
    """
    job_text = f"{job.get('title', '')} {job.get('description', '')} {job.get('requirements', '')}"
    job_tech = extract_tech_stack(job_text)
    student_skills = set(s.lower() for s in (student.get("skills") or []))
    matched_skills = [t for t in job_tech if t.lower() in student_skills]

    company_name = job.get("company") or extract_company(job_text, fallback="the hiring company")
    role_title = job.get("title") or "the targeted role"
    archetype = (student.get("archetype") or "THE_BUILDER").upper()

    # 1. Technical questions based on matched or required tech
    tech_q_list = []
    for t in (matched_skills or job_tech)[:4]:
        t_key = t.lower()
        q_text = _TECH_QUESTIONS.get(t_key)
        if not q_text:
            q_text = f"Can you discuss your practical experience working with {t} and how you apply best practices in it?"
        tech_q_list.append({
            "topic": t,
            "question": q_text,
            "suggested_angle": f"Highlight concrete projects where you utilized {t} and mention specific libraries or patterns.",
        })

    # 2. Behavioral questions with STAR framework starter
    arch_data = _ARCHETYPE_BEHAVIORAL_QUESTIONS.get(
        archetype, 
        _ARCHETYPE_BEHAVIORAL_QUESTIONS["THE_BUILDER"]
    )
    behavioral_q_list = [
        {
            "category": f"Archetype Behavioral ({archetype})",
            "question": arch_data["question"],
            "star_starter": arch_data["star_starter"],
            "focus_area": arch_data["focus"],
        }
    ]
    for gq in _GENERAL_FRESHER_QUESTIONS:
        behavioral_q_list.append({
            "category": gq["category"],
            "question": gq["question"],
            "star_starter": gq["star_guide"],
            "focus_area": "Clarity & structured thinking",
        })

    # 3. Company & Role Research Checklist
    research_checklist = [
        f"Review {company_name}'s core products, target audience, and recent announcements or press releases.",
        f"Understand how the {role_title} position impacts their engineering/business objectives.",
        f"Prepare 2-3 thoughtful questions to ask the interviewer about team workflows, mentorship, and tech stack roadmap.",
        f"Review your portfolio projects that demonstrate skill overlap with {', '.join(job_tech[:4]) if job_tech else 'core requirements'}.",
    ]

    # 4. Talking Points Elevator Pitch
    dept = student.get("department", "Engineering")
    top_skills_str = ", ".join(matched_skills[:3] or list(student_skills)[:3] or ["Full Stack Development", "Python", "Problem Solving"])
    elevator_pitch = (
        f"I am an entry-level candidate with a background in {dept}, specializing in {top_skills_str}. "
        f"My psychometric profile is aligned as {archetype}, which means I bring strong execution, adaptability, and analytical rigor. "
        f"I am enthusiastic about joining {company_name} to contribute to {role_title} and rapidly deliver tangible impact."
    )

    return {
        "candidate_name": student.get("full_name", "Candidate"),
        "role_title": role_title,
        "company": company_name,
        "archetype": archetype,
        "elevator_pitch": elevator_pitch,
        "technical_questions": tech_q_list,
        "behavioral_star_questions": behavioral_q_list,
        "research_checklist": research_checklist,
    }
