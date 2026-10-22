"""
market_router.py
Native market-intelligence router — no sidecar, no httpx, no tokens.
All functions are called directly from services.market_intelligence.

Endpoint paths are unchanged from the previous proxy router.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from api.deps import get_supabase_client


from services.market_intelligence import (
    evaluate_lead_quality,
    extract_lead_intel,
    generate_outreach_draft,
    score_job_fit,
    generate_job_match_card,
    generate_interview_prep,
    expand_github_profile,
    expand_candidate_profile,
    generate_skill_gap_report,
    run_drafter_reviewer_pipeline,
    build_resume_context,
    build_cover_letter_context,
)

logger = logging.getLogger("c2c_api.market")

router = APIRouter(prefix="/market", tags=["market-intelligence"])


# ─── Models ───────────────────────────────────────────────────────────────────

class ScoreFitRequest(BaseModel):
    posting: str
    candidate: dict[str, Any]


class JobMatchCardRequest(BaseModel):
    posting: str
    candidate: dict[str, Any]
    job_meta: dict[str, Any] = {}


class InterviewPrepRequest(BaseModel):
    student: dict[str, Any]
    job: dict[str, Any]


class ExpandProfileRequest(BaseModel):
    student_profile: dict[str, Any]
    github_url: str = ""


class SkillGapReportRequest(BaseModel):
    students: list[dict[str, Any]] = []
    jobs: list[dict[str, Any]] = []
    institution_id: str = ""


class ReviewedApplicationRequest(BaseModel):
    student: dict[str, Any]
    job: dict[str, Any]


class EvaluateLeadRequest(BaseModel):
    lead: dict[str, Any]
    min_quality: int = 60
    target_level: str = "fresher"
    max_age_days: int = 14


class ExtractIntelRequest(BaseModel):
    text: str


class DiscoveryRunRequest(BaseModel):
    sources: list[str] = []
    max_leads: int = 50


class GenerateResumeRequest(BaseModel):
    lead_id: str
    candidate: dict[str, Any]
    posting: str = ""


class GenerateCoverLetterRequest(BaseModel):
    lead_id: str
    posting: str
    candidate: dict[str, Any]


class GenerateOutreachRequest(BaseModel):
    posting: str
    candidate: dict[str, Any]
    style: str = "cold_email"  # cold_email | linkedin_note | founder_message


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/health")
async def market_health():
    """Return native service status — always online when the API is running."""
    return {"status": "ok", "mode": "native"}


@router.post("/score-fit")
async def score_fit(body: ScoreFitRequest):
    """
    Score a job description against a student profile.
    Uses the native deterministic fit rubric (no LLM key required).
    Returns score 0-100 + dimension breakdown.
    """
    try:
        result = score_job_fit(body.posting, body.candidate)
    except Exception as exc:
        logger.exception("score-fit error")
        raise HTTPException(500, f"score_job_fit failed: {exc}") from exc
    logger.info("score-fit result: %s", result.get("score"))
    return result


@router.post("/job-match-card")
async def job_match_card(body: JobMatchCardRequest):
    """
    Generate a 5-dimension job evaluation report card (H1 implementation).
    Returns overall score, letter grade, 5 dimensions with weights/statuses,
    strengths, and growth gaps.
    """
    try:
        result = generate_job_match_card(body.posting, body.candidate, body.job_meta)
    except Exception as exc:
        logger.exception("job-match-card error")
        raise HTTPException(500, f"generate_job_match_card failed: {exc}") from exc
    return result


@router.post("/interview-prep")
async def interview_prep(body: InterviewPrepRequest):
    """
    Generate tailored interview prep kit (H5 implementation).
    Returns role-specific tech questions, STAR behavioral frameworks,
    customized elevator pitch, and company research directives.
    """
    try:
        result = generate_interview_prep(body.student, body.job)
    except Exception as exc:
        logger.exception("interview-prep error")
        raise HTTPException(500, f"generate_interview_prep failed: {exc}") from exc
    return result


@router.post("/expand-profile")
async def expand_profile(body: ExpandProfileRequest):
    """
    Auto-enrich candidate skills and competencies from public GitHub / web footprint (H2 implementation).
    Returns newly discovered skills, merged skills list, repo summaries, and confidence tier.
    """
    try:
        profile = dict(body.student_profile)
        if body.github_url:
            profile["github_url"] = body.github_url
        result = expand_candidate_profile(profile)
        return result
    except Exception as exc:
        logger.exception("expand-profile error")
        raise HTTPException(500, f"expand_candidate_profile failed: {exc}") from exc


@router.post("/skill-gap-report")
async def skill_gap_report(body: SkillGapReportRequest):
    """
    Generate prioritized Cohort vs Market Skill Gap Heatmap (H3 implementation).
    Automatically fetches institution cohort and active job postings if not explicitly passed.
    """
    try:
        students = body.students
        jobs = body.jobs

        # Fallback to Supabase data if not explicitly provided
        if not students or not jobs:
            client = get_supabase_client()
            if client:
                if not students:
                    q = client.table("students").select("id, full_name, skills, department")
                    if body.institution_id:
                        q = q.eq("institution_id", body.institution_id)
                    s_res = q.limit(100).execute()
                    students = s_res.data or []
                if not jobs:
                    j_res = client.table("job_postings").select("id, title, location, role_type").limit(100).execute()
                    jobs = j_res.data or []
                    if not jobs:
                        # Also check market_leads
                        ml_res = client.table("market_leads").select("id, name, ai_summary, ai_notes").limit(100).execute()
                        jobs = [
                            {"title": m.get("name"), "description": m.get("ai_summary") or m.get("ai_notes")}
                            for m in (ml_res.data or [])
                        ]

        result = generate_skill_gap_report(students, jobs)
        return result
    except Exception as exc:
        logger.exception("skill-gap-report error")
        raise HTTPException(500, f"generate_skill_gap_report failed: {exc}") from exc


@router.post("/evaluate-lead")
async def evaluate_lead(body: EvaluateLeadRequest):
    """
    Run the native quality gate on a raw job lead.
    Use before saving any scraped job to the `jobs` table.
    Returns: {accepted: bool, score: int, reason: str, tags: list}
    """
    try:
        return evaluate_lead_quality(
            body.lead,
            min_quality=body.min_quality,
            target_level=body.target_level,
            max_age_days=body.max_age_days,
        )
    except Exception as exc:
        logger.exception("evaluate-lead error")
        raise HTTPException(500, f"evaluate_lead_quality failed: {exc}") from exc


@router.post("/extract-intel")
async def extract_intel(body: ExtractIntelRequest):
    """
    Extract structured intel from raw JD text:
    company, location, budget, urgency, tech_stack, signal_quality.
    Use on employer job-post creation to auto-enrich the job record.
    """
    try:
        return extract_lead_intel(body.text)
    except Exception as exc:
        logger.exception("extract-intel error")
        raise HTTPException(500, f"extract_lead_intel failed: {exc}") from exc


@router.post("/run-discovery")
async def run_discovery(body: DiscoveryRunRequest):
    """
    Stub endpoint — discovery runs are now handled by the native daily sweep
    cron script (scripts/market_daily_sweep.py).
    Returns a informational response.
    """
    return {
        "status": "native",
        "message": (
            "Discovery runs are performed by the native cron sweep. "
            "Run: python scripts/market_daily_sweep.py"
        ),
        "sources_requested": body.sources,
        "max_leads": body.max_leads,
    }


@router.get("/leads")
async def list_leads(status: str = "all", limit: int = 50):
    """
    Placeholder — lead listing is served directly from Supabase via the
    student/employer routers. This endpoint returns guidance.
    """
    return {
        "status": "native",
        "message": "Query the Supabase `leads` table directly via the student or CRM routers.",
        "filter_status": status,
        "limit": limit,
    }


@router.post("/generate/resume")
async def generate_resume(body: GenerateResumeRequest):
    """Generate resume context for a candidate and job posting."""
    try:
        posting = body.posting
        company = ""
        title = ""
        lead_id = body.lead_id
        
        if not posting and lead_id and lead_id != "custom":
            client = get_supabase_client()
            if client:
                try:
                    lead_bigint = int(lead_id)
                    res = client.table("market_leads").select("*").eq("id", lead_bigint).execute()
                    if res.data:
                        lead_data = res.data[0]
                        posting = lead_data.get("ai_summary") or lead_data.get("ai_notes") or ""
                        company = lead_data.get("company") or ""
                        title = lead_data.get("name") or ""
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid lead_id for bigint cast: {lead_id}, error: {e}")
                    
        job = {
            "title": title,
            "description": posting,
            "company": company,
            "lead_id": lead_id
        }
        return build_resume_context(body.candidate, job)
    except Exception as exc:
        logger.exception("generate/resume error")
        raise HTTPException(500, f"build_resume_context failed: {exc}") from exc


@router.post("/download/resume")
async def download_resume(body: GenerateResumeRequest):
    """
    Generate tailored resume context and return the PDF file stream.
    """
    try:
        posting = body.posting
        company = ""
        title = ""
        lead_id = body.lead_id
        
        if not posting and lead_id and lead_id != "custom":
            client = get_supabase_client()
            if client:
                try:
                    lead_bigint = int(lead_id)
                    res = client.table("market_leads").select("*").eq("id", lead_bigint).execute()
                    if res.data:
                        lead_data = res.data[0]
                        posting = lead_data.get("ai_summary") or lead_data.get("ai_notes") or ""
                        company = lead_data.get("company") or ""
                        title = lead_data.get("name") or ""
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid lead_id for bigint cast: {lead_id}, error: {e}")
                    
        job = {
            "title": title,
            "description": posting,
            "company": company,
            "lead_id": lead_id
        }
        context = build_resume_context(body.candidate, job)
        
        from api.pdf_generator import generate_tailored_resume_pdf
        pdf_bytes = generate_tailored_resume_pdf(context)
        
        filename = f"tailored_resume_{body.candidate.get('full_name', 'candidate').replace(' ', '_')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as exc:
        logger.exception("download/resume error")
        raise HTTPException(500, f"generate_tailored_resume_pdf failed: {exc}") from exc



@router.post("/generate/cover-letter")
async def generate_cover_letter(body: GenerateCoverLetterRequest):
    """Generate cover-letter context for a candidate and job posting."""
    try:
        job = {"title": body.posting[:80], "description": body.posting, "lead_id": body.lead_id}
        return build_cover_letter_context(body.candidate, job)
    except Exception as exc:
        logger.exception("generate/cover-letter error")
        raise HTTPException(500, f"build_cover_letter_context failed: {exc}") from exc


@router.post("/generate/reviewed-application")
async def generate_reviewed_application(body: ReviewedApplicationRequest):
    """
    Execute two-pass Drafter-Reviewer pipeline (H4 implementation).
    Drafts tailored cover letter & resume context, reviews ATS keyword alignment,
    flags generic filler, and outputs revised application package.
    """
    try:
        result = run_drafter_reviewer_pipeline(body.student, body.job)
        return result
    except Exception as exc:
        logger.exception("generate/reviewed-application error")
        raise HTTPException(500, f"run_drafter_reviewer_pipeline failed: {exc}") from exc


@router.post("/generate/outreach")
async def generate_outreach(body: GenerateOutreachRequest):
    """
    Generate a hiring manager outreach draft.
    Styles: cold_email | linkedin_note | founder_message.
    Used in WF-04 when student approves a lead.
    """
    try:
        job = {"title": body.posting[:80], "description": body.posting}
        result = generate_outreach_draft(body.candidate, job)
        # Return only the requested style if specified, else return all
        style = body.style
        if style in result:
            return {style: result[style], "follow_up_sequence": result.get("follow_up_sequence", [])}
        return result
    except Exception as exc:
        logger.exception("generate/outreach error")
        raise HTTPException(500, f"generate_outreach_draft failed: {exc}") from exc
