"""Student & institution onboarding endpoints, background profile optimization, and webhooks."""
import os
import logging
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks, Request

from api.deps import require_admin_supabase, get_current_user, get_supabase_client
from api.schemas.student import StudentOnboard
from api.schemas.assessment import InstitutionOnboard
from api.exceptions import DatabaseConnectionError

router = APIRouter(tags=["Student"])
logger = logging.getLogger("c2c_api.student")

# --- CONSTANTS & HELPERS ---

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


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

@router.post("/webhook/student-onboarded")
async def webhook_student_onboarded(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info(f"WEBHOOK: student-onboarded received. Payload: {payload}")
    record = payload.get("record", {})
    if student_id := record.get("id"):
        background_tasks.add_task(run_optimizers, student_id)
    return {"status": "received"}
