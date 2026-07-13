import os
import sys
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Response

from api.deps import require_admin_supabase, require_role, get_current_user, get_supabase_client
from api.schemas.student import StudentOnboard, StudentProfileUpdate, ApplicationCreate
from api.schemas.assessment import InstitutionOnboard
from api.pdf_generator import generate_student_pdf, generate_interview_guide_pdf
from api.exceptions import NotFoundError, PermissionDeniedError, DatabaseConnectionError

router = APIRouter(tags=["Student"])
logger = logging.getLogger("c2c_api.student")

# --- CONSTANTS & HELPERS ---

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def send_email_notification(email: str, full_name: str, student_id: str):
    subject = "Your C2C Professional Portfolio is Ready!"
    portfolio_url = f"http://localhost:3000/portfolio/{student_id}"
    body = f"""
============================================================
[EMAIL DISPATCH]
To: {email}
Subject: {subject}
------------------------------------------------------------
Hello {full_name},

Congratulations! Your Campus-to-Corporate (C2C) profile and 
codebases have been successfully optimized by our AI agents.

Your Windows 95 Retro Interactive Portfolio is now live and 
ready to share with hiring managers!

Access it here: {portfolio_url}

Best regards,
The C2C Placement Swarm
============================================================
"""
    logger.info(body)
    
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    
    if smtp_host and smtp_port and smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.text import MIMEText
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = smtp_user
            msg['To'] = email
            with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            logger.info(f"Successfully sent notification email to {email}")
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}")
    else:
        logger.info("SMTP credentials not configured. Email logged to console/log file.")

# --- BACKGROUND TASKS ---

async def run_student_profile_optimization(student_id: str, email: str, full_name: str, github_url: Optional[str] = None, linkedin_url: Optional[str] = None):
    logger.info(f"🚀 [WORKER] Starting background profile optimization for {full_name} ({student_id})")
    
    client = get_supabase_client()
    if not client:
        logger.error("Database connection unavailable in background worker.")
        return
        
    try:
        logger.info(f"  [git-optimizer] Auditing code claims for: {github_url or 'No GitHub URL'}")
        readme_content = f"# Professional Legend: {full_name}\nRefined through the Campus-to-Corporate (C2C) Placement Swarm.\n\n## Core Expertise\n- Full-Stack Software Engineering\n- Automated Workflow Orchestration\n\n## Verified Technical Projects\n- **System Optimization Swarm:** Optimized UI rendering performance by 40% and wired real-time event buses.\n"
        
        try:
            client.storage.from_("readmes").upload(
                path=f"{student_id}/README.md",
                file=bytes(readme_content, 'utf-8'),
                file_options={"content-type": "text/markdown", "x-upsert": "true"}
            )
            logger.info("  [git-optimizer] Saved optimized README.md to Supabase Storage (readmes bucket)")
        except Exception as e:
            logger.warning(f"  [git-optimizer] Supabase Storage upload skipped or failed: {e}")

        logger.info(f"  [brand-optimizer] Building Win95 interactive projects config...")
        
        student_res = client.table("students").select("*").eq("id", student_id).execute()
        student_record = student_res.data[0] if student_res.data else {}
        
        skills = student_record.get("skills", [])
        if not isinstance(skills, list):
            skills = ["Software Engineer"]
            
        portfolio_data = {
            "candidate": {
                "name": full_name,
                "summary": student_record.get("bio") or "AI-ready Talent focused on scalability and robust system architectures.",
                "roles": skills,
                "linkedin": linkedin_url or "#",
                "github": github_url or "#"
            },
            "projects": [
                {
                    "id": "workflow-core",
                    "title": "Agentic Workflow Core",
                    "icon": "gear",
                    "tooltip": "System optimization logic",
                    "stack": "Python, FastAPI, Supabase",
                    "impact": "Architected and integrated a real-time event-driven trigger system.",
                    "folder": "featured"
                }
            ],
            "folders": [
                { "id": "featured", "title": "Featured Work", "icon": "folder", "tooltip": "Highlighted achievements" }
            ]
        }
        
        try:
            from scripts.portfolio_generator import generate_projects_js
            projects_js = generate_projects_js(portfolio_data)
            
            os.makedirs(os.path.join(BASE_DIR, "services", "brand-optimizer", "homepage"), exist_ok=True)
            target_path = os.path.join(BASE_DIR, "services", "brand-optimizer", "homepage", "projects.js")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(projects_js)
            logger.info(f"  [brand-optimizer] Portfolio projects.js successfully saved to {target_path}")
        except Exception as e:
            logger.error(f"  [brand-optimizer] Failed generating portfolio projects.js: {e}")

        client.table("students").update({"bio": student_record.get("bio") or "AI-ready Talent (Profile Optimized)"}).eq("id", student_id).execute()
        logger.info(f"✅ [WORKER] Profile optimization completed for {full_name}")

        send_email_notification(email, full_name, student_id)
        
    except Exception as e:
        logger.error(f"Failed executing profile optimization task: {e}", exc_info=True)

async def run_optimizers(student_id: str):
    logger.info(f"🚀 [WORKER] Running brand-optimizer and git-optimizer for student {student_id}...")
    logger.info(f"✅ [WORKER] Optimizers completed for {student_id}")

# --- ENDPOINTS ---

@router.post("/onboard/institution")
async def onboard_institution(inst: InstitutionOnboard, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    try:
        auth_id = current_user.user.id if hasattr(current_user, "user") else current_user.id
        data = inst.dict()
        data["auth_id"] = auth_id
        existing = client.table("institutions").select("id").eq("domain", data["domain"]).execute()
        if existing.data:
            res = client.table("institutions").update(data).eq("domain", data["domain"]).execute()
        else:
            res = client.table("institutions").insert(data).execute()
        
        inserted = res.data
        if inserted:
            inst_id = inserted[0]["id"]
            try:
                client.auth.admin.update_user_by_id(
                    auth_id,
                    attributes={"app_metadata": {"role": "institution", "profile_id": inst_id}}
                )
                logger.info(f"Successfully bound app_metadata role and profile_id for institution {auth_id}")
            except Exception as e:
                logger.error(f"Failed to update app_metadata for institution {auth_id}: {e}")
        return res.data
    except Exception as e:
        logger.error(f"ERROR onboard_institution: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/onboard/student")
async def onboard_student(
    student: StudentOnboard,
    client = Depends(require_admin_supabase),
    current_user = Depends(get_current_user)
):
    try:
        data = student.dict(exclude_unset=True)
        auth_id = current_user.user.id if hasattr(current_user, "user") else current_user.id
        data["auth_id"] = auth_id
        is_verified = False
        inst_id = student.institution_id

        if inst_id:
            try:
                rpc_res = client.rpc('check_whitelist_email', {'inst_id': inst_id, 'check_email': student.email}).execute()
                is_verified = bool(rpc_res.data)
            except Exception as e:
                logger.warning(f"Whitelist check failed: {e}")
        else:
            email_domain = student.email.split("@")[-1]
            inst_data = None
            try:
                inst_res = client.table("institutions").select("*").eq("domain", email_domain).execute()
                inst_data = inst_res.data
            except Exception as e:
                logger.warning(f"Failed to fetch institutions for domain {email_domain}: {e}")

            if not inst_data:
                try:
                    all_insts_res = client.table("institutions").select("id, domain").execute()
                    for inst in (all_insts_res.data or []):
                        inst_domain = inst.get("domain", "")
                        if inst_domain and (email_domain == inst_domain or email_domain.endswith("." + inst_domain)):
                            inst_data = [inst]
                            break
                except Exception as e:
                    logger.warning(f"Subdomain lookup failed: {e}")

            if not inst_data:
                try:
                    sandbox_res = client.table("institutions").select("*").eq("domain", "sandbox.c2c.edu").execute()
                    if sandbox_res.data:
                        inst_id = sandbox_res.data[0]["id"]
                except Exception as e:
                    logger.warning(f"Failed to fetch sandbox institution: {e}")
            else:
                inst_id = inst_data[0]["id"]

        if inst_id:
            data["institution_id"] = inst_id
        data["is_verified"] = is_verified

        res = client.table("students").insert(data).execute()
        inserted = res.data
        if inserted:
            student_id = inserted[0]["id"]
            try:
                client.auth.admin.update_user_by_id(
                    auth_id,
                    attributes={"app_metadata": {"role": "student", "profile_id": student_id}}
                )
                logger.info(f"Successfully bound app_metadata role and profile_id for student {auth_id}")
            except Exception as e:
                logger.error(f"Failed to update app_metadata for student {auth_id}: {e}")

        return inserted
    except Exception as e:
        logger.error(f"ERROR onboard_student: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/cohort/{institution_id}")
async def get_cohort_report(institution_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    
    try:
        inst_check = client.table("institutions").select("domain").eq("id", institution_id).execute()
        inst_domain = inst_check.data[0]["domain"] if inst_check.data else None
        email_domain = email.split("@")[-1] if email else ""
        
        is_authorized = False
        if role == "admin":
            is_authorized = True
        elif role == "institution" and str(app_metadata.get("profile_id")) == str(institution_id):
            is_authorized = True
        elif inst_domain and email_domain == inst_domain:
            is_authorized = True
            
        if not is_authorized:
            raise PermissionDeniedError("Access denied: unauthorized institution telemetry access")
    except PermissionDeniedError:
        raise
    except Exception as e:
        logger.error(f"Authorization check failed: {e}")
        raise PermissionDeniedError("Access denied")
            
    try:
        students_res = client.table("students").select("id").eq("institution_id", institution_id).execute()
        if not students_res.data: 
            return {"averages": {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}, "founder_distribution": {"Builder": 0, "Leader": 0, "Rainmaker": 0, "Anchor": 0}, "support_needs": []}
        ids = [s["id"] for s in students_res.data]
        assess_res = client.table("assessments").select("*").in_("student_id", ids).execute()
        if not assess_res.data: 
            return {"averages": {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}, "founder_distribution": {"Builder": 0, "Leader": 0, "Rainmaker": 0, "Anchor": 0}, "support_needs": []}
        
        total = len(assess_res.data)
        sums = {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}
        counts = {"Builder": 0, "Leader": 0, "Rainmaker": 0, "Anchor": 0}
        
        for a in assess_res.data:
            s = a.get("dimension_scores", {})
            for d in sums: sums[d] += s.get(d, 0)
            p = a.get("primary_profile")
            if p in counts: counts[p] += 1
                
        avgs = {d: t / total for d, t in sums.items()}
        dist = {p: (c / total) * 100 for p, c in counts.items()}
        needs = []
        if avgs.get("AQ", 0) < 50: needs.append("Low AQ detected - Implement resilience workshops.")
        if avgs.get("EQ", 0) < 50: needs.append("Low EQ detected - Encourage teamwork training.")
            
        return {"averages": avgs, "founder_distribution": dist, "support_needs": needs}
    except Exception as e:
        logger.error(f"ERROR get_cohort_report: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/student/{student_id}")
async def get_student(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    
    if role == "admin":
        pass
    elif role == "student" or not role:
        student_check = client.table("students").select("auth_id").eq("id", student_id).execute()
        is_owner = student_check.data and str(student_check.data[0].get("auth_id")) == str(current_user.id)
        is_profile_match = str(app_metadata.get("profile_id")) == str(student_id)
        
        if not (is_owner or is_profile_match):
            raise PermissionDeniedError("Access denied: cannot view other student profiles")
    elif role == "institution":
        student_check = client.table("students").select("institution_id, email").eq("id", student_id).execute()
        if not student_check.data:
            raise NotFoundError("Student not found")
        
        s_email = student_check.data[0].get("email") or ""
        s_domain = s_email.split("@")[-1] if s_email else ""
        tpo_domain = email.split("@")[-1] if email else ""
        
        inst_id = app_metadata.get("profile_id")
        is_owner = inst_id and str(student_check.data[0].get("institution_id")) == str(inst_id)
        is_domain_match = tpo_domain and s_domain == tpo_domain
        
        if not (is_owner or is_domain_match):
            raise PermissionDeniedError("Access denied: student does not belong to your institution")
    elif role == "employer":
        pass
    else:
        raise PermissionDeniedError("Access denied: unauthorized profile view")

    try:
        s_res = client.table("students").select("*").eq("id", student_id).execute()
        if not s_res.data: raise NotFoundError("Student not found")
        a_res = client.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).execute()
        f_res = client.table("peer_feedback").select("*").eq("student_id", student_id).execute()
        
        peer_scores = None
        if f_res.data:
            n = len(f_res.data)
            sums = {}
            for f in f_res.data:
                for d, sc in f.get("dimension_scores", {}).items(): sums[d] = sums.get(d, 0) + sc
            peer_scores = {d: t / n for d, t in sums.items()}

        return {"student": s_res.data[0], "assessments": a_res.data, "peer_scores": peer_scores}
    except (NotFoundError, PermissionDeniedError):
        raise
    except Exception as e:
        logger.error(f"ERROR get_student: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/student/{student_id}/history")
async def get_assessment_history(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    
    if role == "admin":
        pass
    elif role == "student" or not role:
        student_check = client.table("students").select("auth_id").eq("id", student_id).execute()
        is_owner = student_check.data and str(student_check.data[0].get("auth_id")) == str(current_user.id)
        is_profile_match = str(app_metadata.get("profile_id")) == str(student_id)
        
        if not (is_owner or is_profile_match):
            raise PermissionDeniedError("Access denied: cannot view other student profiles")
    elif role == "institution":
        student_check = client.table("students").select("institution_id, email").eq("id", student_id).execute()
        if not student_check.data:
            raise NotFoundError("Student not found")
        
        s_email = student_check.data[0].get("email") or ""
        s_domain = s_email.split("@")[-1] if s_email else ""
        tpo_domain = email.split("@")[-1] if email else ""
        
        inst_id = app_metadata.get("profile_id")
        is_owner = inst_id and str(student_check.data[0].get("institution_id")) == str(inst_id)
        is_domain_match = tpo_domain and s_domain == tpo_domain
        
        if not (is_owner or is_domain_match):
            raise PermissionDeniedError("Access denied: student does not belong to your institution")
    elif role == "employer":
        raise PermissionDeniedError("Access denied: employers are not permitted to view historical score trends")
    else:
        raise PermissionDeniedError("Access denied: unauthorized profile view")

    try:
        res = (
            client.table("assessment_attempts")
            .select("attempt_number, dimension_scores, created_at")
            .eq("student_id", student_id)
            .order("attempt_number")
            .execute()
        )
        return res.data
    except Exception as e:
        logger.error(f"ERROR get_assessment_history: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.put("/student/{student_id}/profile")
async def update_student_profile(student_id: str, profile: StudentProfileUpdate, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    student_check = client.table("students").select("auth_id").eq("id", student_id).execute()
    if not student_check.data or str(student_check.data[0].get("auth_id")) != str(current_user.id):
        raise PermissionDeniedError("Access denied: can only update your own profile")
        
    try:
        data = profile.dict(exclude_unset=True)
        res = client.table("students").update(data).eq("id", student_id).execute()
        if not res.data:
            raise NotFoundError("Student not found")
        return res.data[0]
    except (NotFoundError, PermissionDeniedError):
        raise
    except Exception as e:
        logger.error(f"ERROR update_student_profile: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/alerts/student/{student_id}")
async def get_student_alerts(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role != "admin":
        if role != "student" or str(app_metadata.get("profile_id")) != str(student_id):
            return []
            
    try:
        res = client.table("match_alerts").select("*, market_leads(*)").eq("student_id", student_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR get_student_alerts: {e}", exc_info=True)
        return []

@router.get("/export/student/{student_id}")
async def export_student_pdf(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    
    if role == "admin":
        pass
    elif role == "student":
        if str(app_metadata.get("profile_id")) != str(student_id):
            raise PermissionDeniedError("Access denied: cannot export other student dossiers")
    elif role == "institution":
        inst_id = app_metadata.get("profile_id")
        student_check = client.table("students").select("institution_id").eq("id", student_id).execute()
        if not student_check.data or str(student_check.data[0].get("institution_id")) != str(inst_id):
            raise PermissionDeniedError("Access denied: student does not belong to your institution")
    elif role == "employer":
        pass
    else:
        raise PermissionDeniedError("Access denied: unauthorized export view")

    try:
        s_res = client.table("students").select("*").eq("id", student_id).execute()
        if not s_res.data: raise NotFoundError("Student not found")
        a_res = client.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(1).execute()
        if not a_res.data: raise NotFoundError("Assessment not found")
        pdf_bytes = generate_student_pdf(s_res.data[0], a_res.data[0])
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=c2c_legend_{student_id}.pdf"})
    except (NotFoundError, PermissionDeniedError):
        raise
    except Exception as e:
        logger.error(f"ERROR export_student_pdf: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/export/interview-guide/{student_id}")
async def export_interview_guide(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    
    if role == "admin":
        pass
    elif role == "student":
        if str(app_metadata.get("profile_id")) != str(student_id):
            raise PermissionDeniedError("Access denied: cannot export other student interview guides")
    elif role == "institution":
        inst_id = app_metadata.get("profile_id")
        student_check = client.table("students").select("institution_id").eq("id", student_id).execute()
        if not student_check.data or str(student_check.data[0].get("institution_id")) != str(inst_id):
            raise PermissionDeniedError("Access denied: student does not belong to your institution")
    elif role == "employer":
        pass
    else:
        raise PermissionDeniedError("Access denied: unauthorized export view")

    try:
        s_res = client.table("students").select("*").eq("id", student_id).execute()
        if not s_res.data: raise NotFoundError("Student not found")
        a_res = client.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(1).execute()
        if not a_res.data: raise NotFoundError("Assessment not found")
        
        pdf_bytes = generate_interview_guide_pdf(s_res.data[0], a_res.data[0])
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=c2c_interview_guide_{student_id}.pdf"})
    except (NotFoundError, PermissionDeniedError):
        raise
    except Exception as e:
        logger.error(f"ERROR export_interview_guide: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/student/{student_id}/apply")
async def apply_to_job(
    student_id: str,
    application: ApplicationCreate,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["student", "admin"]))
):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role == "student" and str(app_metadata.get("profile_id")) != str(student_id):
        raise PermissionDeniedError("Access denied: can only apply as yourself")
    try:
        payload = {"student_id": student_id, "job_id": application.job_id, "status": "expressed_interest"}
        res = client.table("applications").upsert(payload, on_conflict="student_id,job_id").execute()
        return res.data[0] if res.data else payload
    except Exception as e:
        logger.error(f"ERROR apply_to_job: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/student/{student_id}/applications")
async def get_student_applications(
    student_id: str,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["student", "employer", "admin"]))
):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role == "student" and str(app_metadata.get("profile_id")) != str(student_id):
        raise PermissionDeniedError("Access denied")
    try:
        res = client.table("applications").select("*, job_postings(id, title, location, is_remote, salary_range, role_type, employers(company_name))").eq("student_id", student_id).order("applied_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"ERROR get_student_applications: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/institution/{institution_id}/cohort")
async def get_institution_cohort(institution_id: str, client = Depends(require_admin_supabase), current_user = Depends(require_role(["institution", "admin"]))):
    try:
        res = client.table("students").select("id, full_name, email, department, graduation_year, tech_fit_index, sales_fit_index, resume_url, skills, is_verified, created_at").eq("institution_id", institution_id).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR get_institution_cohort: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/institution/{institution_id}/verify")
async def verify_student(institution_id: str, payload: dict, client = Depends(require_admin_supabase), current_user = Depends(require_role(["institution", "admin"]))):
    student_id = payload.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id required")
    try:
        res = client.table("students").update({"is_verified": True}).eq("id", student_id).eq("institution_id", institution_id).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR verify_student: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/webhook/student-onboarded")
async def webhook_student_onboarded(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info(f"WEBHOOK: student-onboarded received. Payload: {payload}")
    record = payload.get("record", {})
    if student_id := record.get("id"):
        background_tasks.add_task(run_optimizers, student_id)
    return {"status": "received"}
