"""
services/market_intelligence/outreach_generator.py
===================================================
Template-based outreach and document context generation.
No LLM, no external calls — pure string interpolation.

Public API
----------
generate_outreach_draft(student, job) -> dict
build_resume_context(student, job)    -> dict
build_cover_letter_context(student, job) -> dict
"""

from __future__ import annotations

from services.market_intelligence.lead_intel import (
    clean_text,
    extract_location,
    extract_tech_stack,
)

# ─── Archetype voice profiles ─────────────────────────────────────────────────

_ARCHETYPE_VOICE: dict[str, dict[str, str]] = {
    "analyst": {
        "opener": "I approach every problem by first understanding the data",
        "strength": "analytical rigour and structured problem-solving",
        "hook": "I would bring a data-first mindset to your team",
    },
    "builder": {
        "opener": "I love shipping products that people actually use",
        "strength": "pragmatic full-stack delivery from idea to production",
        "hook": "I move fast, learn faster, and leave codebases better than I found them",
    },
    "leader": {
        "opener": "I thrive when I can align people around a clear goal",
        "strength": "cross-functional communication and stakeholder management",
        "hook": "I can be the bridge between your technical and business teams",
    },
    "creator": {
        "opener": "Design is how I turn complexity into clarity",
        "strength": "user-centred thinking and rapid visual prototyping",
        "hook": "I would help your users fall in love with your product",
    },
    "specialist": {
        "opener": "Deep domain knowledge is my edge",
        "strength": "subject-matter expertise and meticulous attention to detail",
        "hook": "I bring depth that generalists rarely can",
    },
}

_DEFAULT_VOICE = {
    "opener": "I am eager to contribute from day one",
    "strength": "quick learning and a collaborative approach",
    "hook": "I would be a motivated addition to your team",
}


def _voice(archetype: str) -> dict[str, str]:
    """Return the voice profile for the candidate's archetype."""
    return _ARCHETYPE_VOICE.get((archetype or "").lower().strip(), _DEFAULT_VOICE)


def _top_skills(student: dict, job: dict, n: int = 4) -> list[str]:
    """Return top-N skills that overlap job tech or, if none, first-N from student."""
    cand_skills: list[str] = student.get("skills") or []
    job_text = clean_text(f"{job.get('title', '')} {job.get('description', '')}")
    job_tech = set(t.lower() for t in extract_tech_stack(job_text))

    ranked = [s for s in cand_skills if s.lower() in job_tech]
    others = [s for s in cand_skills if s.lower() not in job_tech]
    combined = ranked + others
    return combined[:n]


def _job_location(job: dict) -> str:
    """Extract location string from job dict."""
    explicit = job.get("location", "") or ""
    if explicit:
        return explicit
    desc = clean_text(f"{job.get('title', '')} {job.get('description', '')}")
    return extract_location(desc) or "your location"


# ─── Outreach templates ───────────────────────────────────────────────────────

def _cold_email(student: dict, job: dict, skills_str: str, voice: dict) -> str:
    name = student.get("full_name", "Candidate")
    dept = student.get("department", "Engineering")
    role = job.get("title", "the open role")
    company = job.get("company", "your company")
    return (
        f"Subject: Application — {role} | {name}\n\n"
        f"Hi,\n\n"
        f"I'm {name}, a {dept} graduate writing to express strong interest in the "
        f"{role} position at {company}.\n\n"
        f"{voice['opener']}. My core strengths include {voice['strength']}, "
        f"and I have hands-on experience with {skills_str}.\n\n"
        f"{voice['hook']}, and I am ready to contribute immediately.\n\n"
        f"I have attached my resume for your review. "
        f"I'd love the opportunity to speak with you at your convenience.\n\n"
        f"Warm regards,\n{name}"
    )


def _linkedin_note(student: dict, job: dict, skills_str: str, voice: dict) -> str:
    name = student.get("full_name", "Candidate")
    role = job.get("title", "the open role")
    company = job.get("company", "your company")
    return (
        f"Hi — I came across the {role} opening at {company} and I'm genuinely excited. "
        f"I'm {name}, a fresh graduate with strengths in {skills_str}. "
        f"{voice['hook']}. "
        f"Would love a quick call if you have 10 minutes!"
    )


def _founder_message(student: dict, job: dict, skills_str: str, voice: dict) -> str:
    name = student.get("full_name", "Candidate")
    dept = student.get("department", "Engineering")
    role = job.get("title", "the open role")
    company = job.get("company", "your company")
    return (
        f"Hello,\n\n"
        f"I saw {company} is hiring for {role} — I'm {name}, "
        f"a {dept} fresher with strong skills in {skills_str}.\n\n"
        f"{voice['opener']}. I believe I'd fit well with what you're building.\n\n"
        f"Happy to share my resume or take a quick call whenever works for you.\n\n"
        f"Thanks,\n{name}"
    )


def _follow_up_sequence(student: dict, job: dict) -> list[str]:
    name = student.get("full_name", "Candidate")
    role = job.get("title", "the role")
    return [
        (
            f"Day 3 — Follow-up:\n"
            f"Hi, just wanted to confirm you received my application for {role}. "
            f"I remain very interested and happy to answer any questions!"
        ),
        (
            f"Day 7 — Second follow-up:\n"
            f"Hi again — {name} here. I understand you're busy; "
            f"I'll keep it brief: I'm still enthusiastic about the {role} opportunity "
            f"and available for a call at your earliest convenience."
        ),
        (
            f"Day 14 — Final follow-up:\n"
            f"Hi, this is my last follow-up regarding the {role} position. "
            f"If the timing isn't right, no worries — I'd still love to stay connected "
            f"in case a future opportunity arises. Thank you for your time!"
        ),
    ]


# ─── Public API ───────────────────────────────────────────────────────────────

def generate_outreach_draft(student: dict, job: dict) -> dict:
    """
    Generate a full outreach package for a student applying to a job.

    Parameters
    ----------
    student : dict
        Keys: full_name, department, skills (list[str]), archetype, location.
    job : dict
        Keys: title, description, company (optional), location (optional).

    Returns
    -------
    dict
        {cold_email: str, linkedin_note: str, founder_message: str,
         follow_up_sequence: list[str]}
    """
    skills = _top_skills(student, job)
    skills_str = ", ".join(skills) if skills else "core technical skills"
    voice = _voice(student.get("archetype", ""))

    return {
        "cold_email": _cold_email(student, job, skills_str, voice),
        "linkedin_note": _linkedin_note(student, job, skills_str, voice),
        "founder_message": _founder_message(student, job, skills_str, voice),
        "follow_up_sequence": _follow_up_sequence(student, job),
    }


def build_resume_context(student: dict, job: dict) -> dict:
    """
    Build a structured context dict for resume tailoring.

    The dict is designed to feed a resume template renderer or a document
    generation script — no LLM required.

    Returns
    -------
    dict with keys:
        candidate_name, department, top_skills, matched_tech,
        role_title, company, location, archetype_summary, voice_hook
    """
    skills = _top_skills(student, job, n=6)
    job_text = clean_text(f"{job.get('title', '')} {job.get('description', '')}")
    matched_tech = extract_tech_stack(job_text)
    voice = _voice(student.get("archetype", ""))

    return {
        "candidate_name": student.get("full_name", ""),
        "department": student.get("department", ""),
        "top_skills": skills,
        "matched_tech": matched_tech[:8],
        "role_title": job.get("title", ""),
        "company": job.get("company", ""),
        "location": _job_location(job),
        "archetype_summary": voice["strength"],
        "voice_hook": voice["hook"],
    }


def build_cover_letter_context(student: dict, job: dict) -> dict:
    """
    Build a structured context dict for cover-letter generation.

    Returns
    -------
    dict with keys:
        candidate_name, department, role_title, company, location,
        skills_str, opener, strength, hook, follow_up_note
    """
    skills = _top_skills(student, job)
    skills_str = ", ".join(skills) if skills else "relevant technical skills"
    voice = _voice(student.get("archetype", ""))

    return {
        "candidate_name": student.get("full_name", ""),
        "department": student.get("department", ""),
        "role_title": job.get("title", ""),
        "company": job.get("company", ""),
        "location": _job_location(job),
        "skills_str": skills_str,
        "opener": voice["opener"],
        "strength": voice["strength"],
        "hook": voice["hook"],
        "follow_up_note": (
            "I will follow up within three business days if I don't hear back, "
            "and I am happy to provide references or work samples upon request."
        ),
    }
