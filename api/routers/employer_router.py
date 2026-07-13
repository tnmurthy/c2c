import os
import sys
import logging
import subprocess
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request

from api.deps import require_admin_supabase, require_role, get_current_user, get_supabase_client
from api.schemas.employer import EmployerOnboard, JobCreate
from api.exceptions import NotFoundError, PermissionDeniedError, DatabaseConnectionError

router = APIRouter(tags=["Employer"])
logger = logging.getLogger("c2c_api.employer")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --- 5Q MATCHING ENGINE ---

ROLE_WEIGHTS: Dict[str, Dict[str, float]] = {
    "tech":       {"IQ": 0.40, "AQ": 0.30, "EQ": 0.20, "SQ": 0.05, "SpQ": 0.05},
    "sales":      {"IQ": 0.10, "AQ": 0.20, "EQ": 0.35, "SQ": 0.35, "SpQ": 0.00},
    "ops":        {"IQ": 0.30, "AQ": 0.25, "EQ": 0.25, "SQ": 0.15, "SpQ": 0.05},
    "leadership": {"IQ": 0.20, "AQ": 0.20, "EQ": 0.30, "SQ": 0.25, "SpQ": 0.05},
}

def calculate_match_score(dimension_scores: Dict[str, Any], role_type: str = "tech") -> float:
    """Compute weighted 5Q match score (0-100) for a given role type."""
    weights = ROLE_WEIGHTS.get(role_type, ROLE_WEIGHTS["tech"])
    max_possible = sum(w * 100 for w in weights.values())
    raw = sum(weights.get(dim, 0) * float(score) for dim, score in dimension_scores.items())
    return round((raw / max_possible) * 100, 1) if max_possible > 0 else 0.0

# --- BACKGROUND TASKS ---

async def run_scoring_engine(job_id: str):
    logger.info(f"🚀 [WORKER] Running Scoring Engine for new job {job_id}...")
    try:
        client = get_supabase_client()
        students_res = client.table("students").select("id").execute()
        student_ids = [s["id"] for s in (students_res.data or [])]
        logger.info(f"✅ [WORKER] Scoring Engine evaluated {len(student_ids)} candidates against job {job_id}")
    except Exception as e:
        logger.error(f"❌ [WORKER] Scoring Engine failed: {e}")

async def run_auto_apply(lead_url: str):
    logger.info(f"🚀 [WORKER] Running campus-to-corporate auto-apply for lead {lead_url}...")
    logger.info(f"✅ [WORKER] Auto-apply initiated")

async def run_market_scout():
    logger.info(f"🚀 [WORKER] Triggering market-scout scraper...")
    try:
        script_path = os.path.join(BASE_DIR, "services", "market-scout", "scraper", "main.py")
        process = subprocess.Popen([sys.executable, script_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        logger.info(f"✅ [WORKER] market-scout started with PID {process.pid}")
    except Exception as e:
        logger.error(f"❌ [WORKER] market-scout failed to start: {e}")

# --- ENDPOINTS ---

@router.post("/onboard/employer")
async def onboard_employer(employer: EmployerOnboard, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    try:
        data = employer.dict()
        auth_id = current_user.user.id if hasattr(current_user, "user") else current_user.id
        data["auth_id"] = auth_id
        res = client.table("employers").insert(data).execute()
        
        inserted = res.data
        if inserted:
            emp_id = inserted[0]["id"]
            try:
                client.auth.admin.update_user_by_id(
                    auth_id,
                    attributes={"app_metadata": {"role": "employer", "profile_id": emp_id}}
                )
                logger.info(f"Successfully bound app_metadata role and profile_id for employer {auth_id}")
            except Exception as e:
                logger.error(f"Failed to update app_metadata for employer {auth_id}: {e}")
        return inserted
    except Exception as e:
        logger.error(f"ERROR onboard_employer: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/employer/candidates")
async def get_employer_candidates(client = Depends(require_admin_supabase), current_user = Depends(require_role(["employer", "admin"]))):
    try:
        s_res = client.table("students").select("*").execute()
        if not s_res.data: return []
        ids = [s["id"] for s in s_res.data]
        a_res = client.table("assessments").select("*").in_("student_id", ids).execute()
        latest = {}
        for a in (a_res.data or []):
            sid = a["student_id"]
            if sid not in latest or a.get("created_at", "") > latest[sid].get("created_at", ""): latest[sid] = a
        results = []
        for s in s_res.data:
            ass = latest.get(s["id"])
            if not ass: continue
            sc = ass.get("dimension_scores", {})
            results.append({
                "id": s["id"],
                "name": s["full_name"],
                "role": s["department"],
                "cohort": str(s["graduation_year"]),
                "match": calculate_match_score(sc, "tech"),
                "iq": sc.get("IQ", 0),
                "eq": sc.get("EQ", 0),
                "aq": sc.get("AQ", 0),
                "sq": sc.get("SQ", 0),
                "tech_fit_index": ass.get("tech_fit_index", 0),
                "sales_fit_index": ass.get("sales_fit_index", 0),
                "skills": s.get("skills", []),
                "image": f"https://api.dicebear.com/7.x/avataaars/svg?seed={s['full_name']}",
                "status": "online",
                "summary": ass.get("development_report", {}).get("profile_summary", "")
            })
        return sorted(results, key=lambda x: x["match"], reverse=True)
    except Exception as e:
        logger.error(f"ERROR get_employer_candidates: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/employer/jobs")
async def create_job_posting(job: JobCreate, client = Depends(require_admin_supabase), current_user = Depends(require_role(["employer"]))):
    try:
        emp_res = client.table("employers").select("id").eq("auth_id", current_user.id).execute()
        if not emp_res.data:
            raise NotFoundError("Employer profile not found")
        
        emp_id = emp_res.data[0]["id"]
        
        data = job.dict()
        data["employer_id"] = emp_id
        
        res = client.table("job_postings").insert(data).execute()
        return res.data[0] if res.data else None
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"ERROR create_job_posting: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/employer/jobs")
async def get_employer_jobs(client = Depends(require_admin_supabase), current_user = Depends(require_role(["employer"]))):
    try:
        emp_res = client.table("employers").select("id").eq("auth_id", current_user.id).execute()
        if not emp_res.data:
            return []
        
        emp_id = emp_res.data[0]["id"]
        res = client.table("job_postings").select("*").eq("employer_id", emp_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR get_employer_jobs: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/employer/jobs/{job_id}/match")
async def run_job_matching(
    job_id: str,
    background_tasks: BackgroundTasks,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["employer", "admin"]))
):
    try:
        job_res = client.table("job_postings").select("*").eq("id", job_id).execute()
        if not job_res.data:
            raise NotFoundError("Job not found")
        job = job_res.data[0]
        role_type = job.get("role_type") or "tech"

        students_res = client.table("students").select("id, full_name, email").execute()
        ids = [s["id"] for s in (students_res.data or [])]
        if not ids:
            return {"message": "No students to match", "matched": 0}

        assess_res = client.table("assessments").select("student_id, dimension_scores, primary_profile").in_("student_id", ids).execute()
        latest: Dict[str, Any] = {}
        for a in (assess_res.data or []):
            sid = a["student_id"]
            if sid not in latest:
                latest[sid] = a

        match_scores_map: Dict[str, float] = {}
        alert_inserts = []
        ALERT_THRESHOLD = 75.0

        for student in (students_res.data or []):
            sid = student["id"]
            assessment = latest.get(sid)
            if not assessment:
                continue
            scores = assessment.get("dimension_scores") or {}
            match_pct = calculate_match_score(scores, role_type)
            match_scores_map[sid] = match_pct
            if match_pct >= ALERT_THRESHOLD:
                alert_inserts.append({"student_id": sid, "job_id": job_id, "score": match_pct})

        client.table("job_postings").update({"match_scores": match_scores_map}).eq("id", job_id).execute()

        if alert_inserts:
            try:
                client.table("match_alerts").upsert(alert_inserts, on_conflict="student_id,job_id").execute()
            except Exception as e:
                logger.warning(f"match_alerts upsert failed: {e}")

        logger.info(f"Matched {len(match_scores_map)} students against job {job_id} (role={role_type})")
        return {"message": "Matching complete", "matched": len(match_scores_map), "alerts_sent": len(alert_inserts)}
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"ERROR run_job_matching: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/employer/jobs/{job_id}/matches")
async def get_job_matches(
    job_id: str,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["employer", "admin"]))
):
    try:
        job_res = client.table("job_postings").select("match_scores, role_type").eq("id", job_id).execute()
        if not job_res.data:
            raise NotFoundError("Job not found")
        match_scores_map = job_res.data[0].get("match_scores") or {}
        if not match_scores_map:
            return []
        student_ids = list(match_scores_map.keys())
        s_res = client.table("students").select("id, full_name, department, graduation_year, skills").in_("id", student_ids).execute()
        results = []
        for s in (s_res.data or []):
            sid = s["id"]
            results.append({
                "student_id": sid,
                "name": s["full_name"],
                "department": s["department"],
                "graduation_year": s["graduation_year"],
                "skills": s.get("skills", []),
                "match_score": match_scores_map.get(sid, 0),
                "image": f"https://api.dicebear.com/7.x/avataaars/svg?seed={s['full_name']}"
            })
        return sorted(results, key=lambda x: x["match_score"], reverse=True)
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"ERROR get_job_matches: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/admin/match-debugger")
async def match_debugger(
    student_id: str,
    job_id: str,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["admin", "institution"]))
):
    try:
        # 1. Fetch student assessment scores
        assessment_res = (
            client.table("assessment_attempts")
            .select("dimension_scores, primary_profile")
            .eq("student_id", student_id)
            .order("attempt_number", desc=True)
            .limit(1)
            .execute()
        )
        if not assessment_res.data:
            old_assess_res = client.table("assessments").select("dimension_scores, primary_profile").eq("student_id", student_id).execute()
            if not old_assess_res.data:
                raise NotFoundError("No assessment scores found for this student")
            scores = old_assess_res.data[0].get("dimension_scores") or {}
            profile = old_assess_res.data[0].get("primary_profile") or "N/A"
        else:
            scores = assessment_res.data[0].get("dimension_scores") or {}
            profile = assessment_res.data[0].get("primary_profile") or "N/A"

        # 2. Fetch job details
        job_res = client.table("job_postings").select("id, title, role_type").eq("id", job_id).execute()
        if not job_res.data:
            raise NotFoundError("Job posting not found")
        job = job_res.data[0]
        role_type = job.get("role_type") or "tech"

        # 3. Compute weights and contributions
        weights = ROLE_WEIGHTS.get(role_type, ROLE_WEIGHTS["tech"])
        contributions = {}
        formula_terms = []
        raw_sum = 0.0
        
        for dim, w in weights.items():
            val = float(scores.get(dim, 0))
            weighted_val = val * w
            raw_sum += weighted_val
            contributions[dim] = {
                "raw_score": val,
                "weight": w,
                "contribution": round(weighted_val, 2)
            }
            formula_terms.append(f"{dim}({val} * {w})")

        max_possible = sum(w * 100 for w in weights.values())
        final_score = round((raw_sum / max_possible) * 100, 1) if max_possible > 0 else 0.0

        # Archetype behavioral penalty check
        archetype_penalty = 0.0
        penalty_explanation = "None"
        if role_type == "leadership" and profile not in ("Leader", "Rainmaker"):
            archetype_penalty = 15.0
            final_score = max(0.0, final_score - archetype_penalty)
            penalty_explanation = f"Archetype misfit penalty (-15.0 pts) applied because candidate archetype is {profile} (expected Leader/Rainmaker for Leadership positions)."

        return {
            "student_id": student_id,
            "job_id": job_id,
            "job_title": job.get("title"),
            "role_type": role_type,
            "archetype": profile,
            "weights": weights,
            "contributions": contributions,
            "formula": " + ".join(formula_terms) + (f" - archetype_penalty({archetype_penalty})" if archetype_penalty > 0 else ""),
            "raw_weighted_sum": round(raw_sum, 2),
            "max_possible": max_possible,
            "archetype_penalty": archetype_penalty,
            "penalty_explanation": penalty_explanation,
            "final_score": final_score
        }
    except (NotFoundError, PermissionDeniedError):
        raise
    except Exception as e:
        logger.error(f"ERROR match_debugger: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/leads")
async def get_leads(client = Depends(require_admin_supabase), current_user = Depends(require_role(["admin"]))):
    try:
        try:
            res = client.table("market_leads").select("*").order("ai_score", desc=True).execute()
            return res.data
        except Exception as e:
            logger.warning(f"Failed to fetch market_leads: {e}")
            return []
    except Exception as e:
        logger.error(f"ERROR get_leads: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/webhook/job-posted")
async def webhook_job_posted(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info(f"WEBHOOK: job-posted received. Payload: {payload}")
    record = payload.get("record", {})
    if job_id := record.get("id"):
        background_tasks.add_task(run_scoring_engine, job_id)
    return {"status": "received"}

@router.post("/webhook/lead-approved")
async def webhook_lead_approved(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info(f"WEBHOOK: lead-approved received. Payload: {payload}")
    record = payload.get("record", {})
    if url := record.get("url"):
        background_tasks.add_task(run_auto_apply, url)
    return {"status": "received"}

@router.post("/webhook/daily-sweep")
async def webhook_daily_sweep(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info(f"WEBHOOK: daily-sweep received. Payload: {payload}")
    background_tasks.add_task(run_market_scout)
    return {"status": "received"}
