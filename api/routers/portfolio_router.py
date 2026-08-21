import logging
from fastapi import APIRouter, Depends, Response

from api.deps import require_admin_supabase
from api.exceptions import NotFoundError, DatabaseConnectionError
from api.pdf_generator import generate_student_pdf

router = APIRouter(tags=["Portfolio"])
logger = logging.getLogger("c2c_api.portfolio")

PORTFOLIO_EXPORT_BUCKET = "portfolio-exports"
SIGNED_URL_EXPIRY_SECONDS = 60 * 60  # 1 hour

# Icon a project falls back to when the source data (skills/department) gives
# no better hint -- must be one of the enum values in PORTFOLIO_SCHEMA.json.
DEFAULT_PROJECT_ICON = "gear"


def _build_portfolio_payload(student: dict, assessment: dict, dev_report: dict) -> dict:
    """Shape student + assessment data into the public PORTFOLIO_SCHEMA.json
    contract. Deliberately excludes raw assessment_responses / question-level
    data -- this endpoint is unauthenticated and publicly shareable."""
    full_name = student.get("full_name", "")
    skills = student.get("skills", [])
    if not isinstance(skills, list) or not skills:
        skills = ["Software Engineer"]

    summary = (
        dev_report.get("profile_summary")
        or (assessment.get("development_report") or {}).get("profile_summary")
        or student.get("bio")
        or "AI-ready Talent focused on scalability and robust system architectures."
    )

    return {
        "candidate": {
            "name": full_name,
            "summary": summary,
            "roles": skills,
            "linkedin": student.get("linkedin_url") or "#",
            "github": "#",  # no github_url column on students yet
        },
        "projects": [
            {
                "id": "core-archetype",
                "title": f"{assessment.get('primary_profile', 'Candidate')} Archetype Profile",
                "icon": DEFAULT_PROJECT_ICON,
                "tooltip": "5Q assessment-derived founder archetype",
                "stack": "C2C 5Q Assessment Engine",
                "impact": summary,
                "folder": "featured",
            }
        ],
        "folders": [
            {"id": "featured", "title": "Featured Work", "icon": "folder", "tooltip": "Highlighted achievements"}
        ],
        "certifications": [],
    }


@router.get("/portfolio/{student_id}")
async def get_public_portfolio(student_id: str, client=Depends(require_admin_supabase)):
    """Public endpoint (no auth) backing the shareable retro portfolio page.
    Uses the service-role client because there is no public RLS policy on
    `students` yet (RLS audit is Phase 5) -- sanitization happens here in
    Python by only selecting/returning non-sensitive fields."""
    try:
        student_res = (
            client.table("students")
            .select("full_name, department, skills, bio, linkedin_url")
            .eq("id", student_id)
            .execute()
        )
        if not student_res.data:
            raise NotFoundError("Student not found")
        student = student_res.data[0]

        assess_res = (
            client.table("assessments")
            .select("primary_profile, dimension_scores, founder_fit, development_report")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        assessment = assess_res.data[0] if assess_res.data else {}

        report_res = (
            client.table("development_reports")
            .select("profile_summary, actionable_feedback")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        dev_report = report_res.data[0] if report_res.data else {}

        return _build_portfolio_payload(student, assessment, dev_report)
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"ERROR get_public_portfolio: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))


@router.post("/portfolio/{student_id}/export")
async def export_portfolio_pdf(student_id: str, client=Depends(require_admin_supabase)):
    """Generates a PDF dossier and returns a signed, time-limited Supabase
    Storage URL rather than the raw PDF bytes, so the export can be shared
    as a link (matches the pattern used for other generated assets)."""
    try:
        student_res = client.table("students").select("*").eq("id", student_id).execute()
        if not student_res.data:
            raise NotFoundError("Student not found")
        student = student_res.data[0]

        assess_res = (
            client.table("assessments")
            .select("*")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        assessment = assess_res.data[0] if assess_res.data else {}

        pdf_bytes = generate_student_pdf(student, assessment)
        storage_path = f"{student_id}/dossier.pdf"

        try:
            client.storage.from_(PORTFOLIO_EXPORT_BUCKET).upload(
                path=storage_path,
                file=pdf_bytes,
                file_options={"content-type": "application/pdf", "x-upsert": "true"},
            )
            signed = client.storage.from_(PORTFOLIO_EXPORT_BUCKET).create_signed_url(
                storage_path, SIGNED_URL_EXPIRY_SECONDS
            )
            return {"url": signed.get("signedURL"), "expires_in": SIGNED_URL_EXPIRY_SECONDS}
        except Exception as e:
            logger.warning(f"Storage upload/sign failed for portfolio export {student_id}: {e}")
            return Response(content=pdf_bytes, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename=portfolio_{student_id}.pdf"})
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"ERROR export_portfolio_pdf: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))
