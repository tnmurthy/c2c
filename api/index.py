import os
import sys
import random
import re
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, APIRouter, Depends, status
from fastapi.responses import Response
from pydantic import BaseModel

# Add service directories to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, "services", "job-intel-desk", "backend"))
sys.path.append(os.path.join(BASE_DIR, "services", "market-scout"))

# Setup logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(name)s] %(levelname)s: %(message)s')
logger = logging.getLogger("c2c_api")

# Imports from modular files
from api.constants import ICONS, RECOMMENDATION_MAPPING
from api.deps import get_supabase_client, require_supabase, get_current_user, require_role
from api.pdf_generator import generate_student_pdf, generate_interview_guide_pdf

try:
    from agents.scoring_engine import score_job_lead, analyze_candidate, analyze_posting
except ImportError:
    logger.warning("agents.scoring_engine not found. AI scoring features will be disabled.")

try:
    from scripts.c2c_orchestrator_v2 import C2C_Orchestrator_V2
except ImportError:
    # Fallback to keep interface compatible if scripts/ module path isn't resolved yet
    class C2C_Orchestrator_V2:
        def __init__(self, candidate_name, audit_gaps):
            self.candidate = candidate_name
            self.gaps = audit_gaps
            self.evidence_scores = {str(gap): 0 for gap in audit_gaps}
            self.logs = []
        def run_ordeal_session(self):
            return {"candidate": self.candidate, "final_status": "CERTIFIED"}

app = FastAPI()

# --- MODELS ---

class InstitutionOnboard(BaseModel):
    name: str
    type: str
    domain: str
    location: str

class StudentOnboard(BaseModel):
    full_name: str
    email: str
    department: str
    graduation_year: int
    institution_id: Optional[int] = None

class StudentProfileUpdate(BaseModel):
    bio: Optional[str] = None
    skills: Optional[list[str]] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    resume_url: Optional[str] = None

class EmployerOnboard(BaseModel):
    company_name: str
    industry: str
    contact_person: str

class JobCreate(BaseModel):
    title: str
    description: str
    requirements: list[str]
    location: Optional[str] = None
    is_remote: bool = False
    salary_range: Optional[str] = None

class AssessmentSubmit(BaseModel):
    student_id: str
    responses: List[Dict[str, Any]] # Expected: { "item_id": "...", "response": "..." }

class FeedbackSubmit(BaseModel):
    student_id: str
    reviewer_email: str
    reviewer_role: str
    dimension_scores: Dict[str, float]
    feedback_text: str

class AuditRequest(BaseModel):
    candidate: Dict[str, Any]
    job_description: str

class OrdealRequest(BaseModel):
    candidate_name: str
    gaps: List[Any]

class PortfolioRequest(BaseModel):
    candidate: Dict[str, Any]
    projects: List[Dict[str, Any]]
    folders: List[Dict[str, Any]]

# --- HELPERS ---

def parse_scoring_logic(logic_str: str, item_type: str) -> Dict[str, Any]:
    if not logic_str or not isinstance(logic_str, str):
        return {}
    
    logic = {}
    item_type_lower = item_type.lower()
    if "sjt" in item_type_lower:
        matches = re.findall(r'([A-E]):\s*(\d+)', logic_str)
        if matches:
            logic["mapping"] = {k: int(v) for k, v in matches}
    elif "likert" in item_type_lower:
        if "high score = high" in logic_str.lower():
            logic["direction"] = "forward"
        elif "low score = high" in logic_str.lower() or "reverse" in logic_str.lower():
            logic["direction"] = "reverse"
        else:
            logic["direction"] = "forward"
    elif "cognitive" in item_type_lower:
        match = re.search(r'Correct:\s*([A-E]|\d+)', logic_str, re.I)
        if match:
            logic["correct_answer"] = match.group(1)
            
    return logic

def generate_development_report(scores: Dict[str, int], founder_profile: str) -> Dict[str, Any]:
    report = {
        "profile_summary": "",
        "actionable_feedback": []
    }
    
    if founder_profile == "Builder":
        report["profile_summary"] = "Builders thrive on creating and optimizing systems. They combine high cognitive and adversity quotients to solve complex problems."
    elif founder_profile == "Leader":
        report["profile_summary"] = "Leaders excel at rallying teams and building culture. They leverage high emotional and social intelligence."
    elif founder_profile == "Rainmaker":
        report["profile_summary"] = "Rainmakers are natural advocates and relationship builders. They use social and adversity quotients to drive growth."
    elif founder_profile == "Anchor":
        report["profile_summary"] = "Anchors provide stability and process. They combine cognitive and emotional intelligence to manage operations effectively."
        
    if scores.get("AQ", 0) < 50:
        report["actionable_feedback"].append("Your AQ is below 50. Consider engaging in resilience-building exercises and taking on challenging projects with mentorship.")
    if scores.get("SQ", 0) > 80:
        report["actionable_feedback"].append("Your SQ is high (> 80). Suggest pursuing leadership roles in student clubs or organizing community events.")
    if scores.get("IQ", 0) < 50:
        report["actionable_feedback"].append("Consider supplemental courses or study groups to strengthen core problem-solving (IQ) skills.")
    if scores.get("EQ", 0) > 80:
        report["actionable_feedback"].append("Your EQ is excellent. You might make a great peer mentor or team mediator.")
        
    return report

def generate_portfolio_json(portfolio_data):
    projects_list = []
    for proj in portfolio_data['projects']:
        content = f"<h3>{proj['title']}</h3><p>{proj['impact']}</p>"
        if 'stack' in proj: content += f"<p><strong>Stack:</strong> {proj['stack']}</p>"
        projects_list.append({
            "id": proj["id"], "title": proj["title"], "icon": ICONS.get(proj["icon"], ICONS['folder']),
            "tooltip": proj.get("tooltip", proj["title"]), "content": content
        })
    cand = portfolio_data['candidate']
    aboutMeContent = {
        "id": 'about', "title": 'About Me', "icon": ICONS.get('computer'),
        "content": f"<h3>{cand.get('name', 'Candidate')}</h3><p>{cand.get('summary', '')}</p>"
    }
    return {"projects": projects_list, "aboutMeContent": aboutMeContent}

# --- API ROUTER ---

router = APIRouter()

@router.get("/")
def status():
    return {"status": "c2c api online"}

@router.post("/onboard/institution")
async def onboard_institution(inst: InstitutionOnboard, client = Depends(require_supabase)):
    try:
        res = client.table("institutions").upsert(inst.dict(), on_conflict="domain").execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR onboard_institution: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboard/student")
async def onboard_student(student: StudentOnboard, client = Depends(require_supabase)):
    domain = student.email.split("@")[-1]
    try:
        inst_res = client.table("institutions").select("*").eq("domain", domain).execute()
        
        if not inst_res.data:
            # Check if a default/sandbox institution exists, otherwise create it
            sandbox_res = client.table("institutions").select("*").eq("domain", "sandbox.c2c.edu").execute()
            if sandbox_res.data:
                inst_data = sandbox_res.data[0]
            else:
                # Create a sandbox institution
                sandbox_payload = {
                    "name": "Global Sandbox University",
                    "type": "University",
                    "domain": "sandbox.c2c.edu",
                    "location": "Cloud Node"
                }
                new_inst = client.table("institutions").insert(sandbox_payload).execute()
                inst_data = new_inst.data[0] if new_inst.data else None
            
            if not inst_data:
                raise HTTPException(status_code=400, detail="Institution domain not registered and Sandbox allocation failed")
            
            institution_id = inst_data["id"]
        else:
            institution_id = inst_res.data[0]["id"]
            
        data = student.dict()
        data["institution_id"] = institution_id
        res = client.table("students").insert(data).execute()
        return res.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR onboard_student: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboard/employer")
async def onboard_employer(employer: EmployerOnboard, client = Depends(require_supabase), current_user = Depends(get_current_user)):
    try:
        data = employer.dict()
        data["auth_id"] = current_user.user.id
        res = client.table("employers").insert(data).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR onboard_employer: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assessment/generate")
async def generate_assessment(num_per_section: int = 25, client = Depends(require_supabase), current_user = Depends(get_current_user)):
    dimensions = ["IQ", "EQ", "SQ", "AQ", "SpQ"]
    final_items = []
    try:
        bank_data = []
        try:
            with open("scripts/FULL_PSYCHOMETRIC_BANK.json", "r", encoding="utf-8") as f:
                bank_data = json.load(f)
        except Exception:
            pass

        for dim in dimensions:
            res = client.table("psychometric_items").select("*").eq("primary_dimension", dim).execute()
            items = res.data
            
            if not items and bank_data:
                items = [item for item in bank_data if item.get("primary_dimension") == dim]

            if items:
                count = min(len(items), random.randint(25, 30) if num_per_section == 25 else num_per_section)
                final_items.extend(random.sample(items, count))
                
        if not final_items:
            raise Exception("Database empty and fallback JSON missing")
            
        return final_items
    except Exception as e:
        logger.error(f"ERROR generate_assessment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assessment/submit")
async def submit_assessment(submit: AssessmentSubmit, client = Depends(require_supabase), current_user = Depends(require_role(["student", "admin"]))):
    scores = {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}
    try:
        item_ids = [r["item_id"] for r in submit.responses]
        items_res = client.table("psychometric_items").select("*").in_("id", item_ids).execute()
        items_map = {item["id"]: item for item in items_res.data}
        
        if not items_map:
            try:
                with open("scripts/FULL_PSYCHOMETRIC_BANK.json", "r", encoding="utf-8") as f:
                    bank_data = json.load(f)
                    items_map = {item["id"]: item for item in bank_data if item["id"] in item_ids}
            except Exception:
                pass
        
        for resp in submit.responses:
            item = items_map.get(resp["item_id"])
            if not item: continue
            val, dim = resp["response"], item["primary_dimension"]
            logic_raw = item.get("scoring_logic")
            logic_str = logic_raw.get("raw", "") if isinstance(logic_raw, dict) else str(logic_raw or "")
            
            try:
                logic = parse_scoring_logic(logic_str, item["item_type"])
                if item["item_type"].lower() == "likert":
                    s = int(val)
                    if logic.get("direction") == "reverse": s = 6 - s
                    scores[dim] += s
                elif item["item_type"].lower() == "cognitive":
                    if str(val) == str(logic.get("correct_answer")): scores[dim] += 1
                elif "sjt" in item["item_type"].lower():
                    m = logic.get("mapping") or {}
                    if val in m: scores[dim] += m[val]
            except Exception as e:
                logger.warning(f"Failed parsing scoring logic for item {resp['item_id']}: {e}")
        
        founder_fit = {
            "Builder": scores.get("IQ", 0) + scores.get("AQ", 0),
            "Leader": scores.get("EQ", 0) + scores.get("SQ", 0),
            "Rainmaker": scores.get("SQ", 0) + scores.get("AQ", 0),
            "Anchor": scores.get("IQ", 0) + scores.get("EQ", 0)
        }
        primary_profile = max(founder_fit, key=founder_fit.get)
        dev_report = generate_development_report(scores, primary_profile)
        
        payload = {
            "student_id": submit.student_id, 
            "dimension_scores": scores, 
            "founder_fit": founder_fit,
            "primary_profile": primary_profile,
            "development_report": dev_report
        }
        assess_res = client.table("assessments").insert(payload).execute()
        
        # Save individual responses to assessment_responses table for Item Analysis
        if assess_res.data:
            assessment_id = assess_res.data[0]["id"]
            responses_payload = []
            for resp in submit.responses:
                responses_payload.append({
                    "student_id": submit.student_id,
                    "assessment_id": assessment_id,
                    "question_id": resp["item_id"],
                    "response": str(resp["response"])
                })
            if responses_payload:
                try:
                    client.table("assessment_responses").insert(responses_payload).execute()
                except Exception as ex_resp:
                    logger.error(f"Failed to save assessment responses: {ex_resp}")
                    
        return payload
    except Exception as e:
        logger.error(f"ERROR submit_assessment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cohort/{institution_id}")
async def get_cohort_report(institution_id: str, client = Depends(require_supabase), current_user = Depends(get_current_user)):
    # Enforce RBAC
    metadata = getattr(current_user, "user_metadata", {}) or {}
    role = metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    
    try:
        inst_check = client.table("institutions").select("domain").eq("id", institution_id).execute()
        inst_domain = inst_check.data[0]["domain"] if inst_check.data else None
        email_domain = email.split("@")[-1] if email else ""
        
        is_authorized = False
        if role == "admin" or email.endswith("@taliatech.in"):
            is_authorized = True
        elif role == "institution" and str(metadata.get("profile_id")) == str(institution_id):
            is_authorized = True
        elif inst_domain and email_domain == inst_domain:
            is_authorized = True
            
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Access denied: unauthorized institution telemetry access")
            
    try:
        students_res = client.table("students").select("id").eq("institution_id", institution_id).execute()
        if not students_res.data: return {"averages": {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}, "founder_distribution": {"Builder": 0, "Leader": 0, "Rainmaker": 0, "Anchor": 0}, "support_needs": []}
        ids = [s["id"] for s in students_res.data]
        assess_res = client.table("assessments").select("*").in_("student_id", ids).execute()
        if not assess_res.data: return {"averages": {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}, "founder_distribution": {"Builder": 0, "Leader": 0, "Rainmaker": 0, "Anchor": 0}, "support_needs": []}
        
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
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leads")
async def get_leads(client = Depends(require_supabase), current_user = Depends(require_role(["admin"]))):
    try:
        res = client.table("market_leads").select("*").order("ai_score", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR get_leads: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/{student_id}")
async def get_student(student_id: str, client = Depends(require_supabase), current_user = Depends(get_current_user)):
    metadata = getattr(current_user, "user_metadata", {}) or {}
    role = metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    
    # Enforce RBAC
    if role == "admin" or email.endswith("@taliatech.in"):
        pass
    elif role == "student" or not role:
        # If role is missing in metadata, strictly check if the requested student_id belongs to the current user's auth_id
        student_check = client.table("students").select("auth_id").eq("id", student_id).execute()
        is_owner = student_check.data and str(student_check.data[0].get("auth_id")) == str(current_user.id)
        
        if role == "student" and str(metadata.get("profile_id")) != str(student_id) and not is_owner:
            raise HTTPException(status_code=403, detail="Access denied: cannot view other student profiles")
        elif not role and not is_owner:
            # Fall through to institution check if no role is explicitly set
            pass
        elif is_owner:
            pass # Authorized
    elif role == "institution" or not role:
        # Get the student's email to compare domains
        student_check = client.table("students").select("institution_id, email").eq("id", student_id).execute()
        if not student_check.data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        s_email = student_check.data[0].get("email") or ""
        s_domain = s_email.split("@")[-1] if s_email else ""
        tpo_domain = email.split("@")[-1] if email else ""
        
        # Allow if TPO profile matches or if email domain matches student email domain!
        inst_id = metadata.get("profile_id")
        is_owner = inst_id and str(student_check.data[0].get("institution_id")) == str(inst_id)
        is_domain_match = tpo_domain and s_domain == tpo_domain
        
        if not (is_owner or is_domain_match):
            raise HTTPException(status_code=403, detail="Access denied: student does not belong to your institution")
    elif role == "employer":
        pass
    else:
        raise HTTPException(status_code=403, detail="Access denied: unauthorized profile view")

    try:
        s_res = client.table("students").select("*").eq("id", student_id).execute()
        if not s_res.data: raise HTTPException(status_code=404, detail="Student not found")
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR get_student: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/student/{student_id}/profile")
async def update_student_profile(student_id: str, profile: StudentProfileUpdate, client = Depends(require_supabase), current_user = Depends(get_current_user)):
    # Verify owner
    student_check = client.table("students").select("auth_id").eq("id", student_id).execute()
    if not student_check.data or str(student_check.data[0].get("auth_id")) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied: can only update your own profile")
        
    try:
        data = profile.dict(exclude_unset=True)
        res = client.table("students").update(data).eq("id", student_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Student not found")
        return res.data[0]
    except Exception as e:
        logger.error(f"ERROR update_student_profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/employer/candidates")
async def get_employer_candidates(client = Depends(require_supabase), current_user = Depends(require_role(["employer", "admin"]))):
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
                "match": random.randint(85, 98),
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
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/employer/jobs")
async def create_job_posting(job: JobCreate, client = Depends(require_supabase), current_user = Depends(require_role(["employer"]))):
    try:
        # Get employer ID for current user
        emp_res = client.table("employers").select("id").eq("auth_id", current_user.id).execute()
        if not emp_res.data:
            raise HTTPException(status_code=404, detail="Employer profile not found")
        
        emp_id = emp_res.data[0]["id"]
        
        data = job.dict()
        data["employer_id"] = emp_id
        
        res = client.table("job_postings").insert(data).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"ERROR create_job_posting: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/employer/jobs")
async def get_employer_jobs(client = Depends(require_supabase), current_user = Depends(require_role(["employer"]))):
    try:
        emp_res = client.table("employers").select("id").eq("auth_id", current_user.id).execute()
        if not emp_res.data:
            return []
        
        emp_id = emp_res.data[0]["id"]
        res = client.table("job_postings").select("*").eq("employer_id", emp_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR get_employer_jobs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback/submit")
async def submit_feedback(submit: FeedbackSubmit, client = Depends(require_supabase)):
    try:
        res = client.table("peer_feedback").insert(submit.dict()).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR submit_feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts/student/{student_id}")
async def get_student_alerts(student_id: str, client = Depends(require_supabase), current_user = Depends(get_current_user)):
    metadata = getattr(current_user, "user_metadata", {}) or {}
    role = metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    if not (role == "admin" or email.endswith("@taliatech.in")):
        if role != "student" or str(metadata.get("profile_id")) != str(student_id):
            return []
            
    try:
        res = client.table("match_alerts").select("*, market_leads(*)").eq("student_id", student_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR get_student_alerts: {e}", exc_info=True)
        return []

@router.get("/export/student/{student_id}")
async def export_student_pdf(student_id: str, client = Depends(require_supabase), current_user = Depends(get_current_user)):
    metadata = getattr(current_user, "user_metadata", {}) or {}
    role = metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    
    # Enforce RBAC
    if role == "admin" or email.endswith("@taliatech.in"):
        pass
    elif role == "student":
        if str(metadata.get("profile_id")) != str(student_id):
            raise HTTPException(status_code=403, detail="Access denied: cannot export other student dossiers")
    elif role == "institution":
        inst_id = metadata.get("profile_id")
        student_check = client.table("students").select("institution_id").eq("id", student_id).execute()
        if not student_check.data or str(student_check.data[0].get("institution_id")) != str(inst_id):
            raise HTTPException(status_code=403, detail="Access denied: student does not belong to your institution")
    elif role == "employer":
        pass
    else:
        raise HTTPException(status_code=403, detail="Access denied: unauthorized export view")

    try:
        s_res = client.table("students").select("*").eq("id", student_id).execute()
        if not s_res.data: raise HTTPException(status_code=404, detail="Student not found")
        a_res = client.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(1).execute()
        if not a_res.data: raise HTTPException(status_code=404, detail="Assessment not found")
        pdf_bytes = generate_student_pdf(s_res.data[0], a_res.data[0])
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=c2c_legend_{student_id}.pdf"})
    except Exception as e:
        logger.error(f"ERROR export_student_pdf: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export/interview-guide/{student_id}")
async def export_interview_guide(student_id: str, client = Depends(require_supabase), current_user = Depends(get_current_user)):
    metadata = getattr(current_user, "user_metadata", {}) or {}
    role = metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    
    # Enforce RBAC
    if role == "admin" or email.endswith("@taliatech.in"):
        pass
    elif role == "student":
        if str(metadata.get("profile_id")) != str(student_id):
            raise HTTPException(status_code=403, detail="Access denied: cannot export other student interview guides")
    elif role == "institution":
        inst_id = metadata.get("profile_id")
        student_check = client.table("students").select("institution_id").eq("id", student_id).execute()
        if not student_check.data or str(student_check.data[0].get("institution_id")) != str(inst_id):
            raise HTTPException(status_code=403, detail="Access denied: student does not belong to your institution")
    elif role == "employer":
        pass
    else:
        raise HTTPException(status_code=403, detail="Access denied: unauthorized export view")

    try:
        s_res = client.table("students").select("*").eq("id", student_id).execute()
        if not s_res.data: raise HTTPException(status_code=404, detail="Student not found")
        a_res = client.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(1).execute()
        if not a_res.data: raise HTTPException(status_code=404, detail="Assessment not found")
        
        pdf_bytes = generate_interview_guide_pdf(s_res.data[0], a_res.data[0])
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=c2c_interview_guide_{student_id}.pdf"})
    except Exception as e:
        logger.error(f"ERROR export_interview_guide: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/item-analysis")
async def get_item_analysis(client = Depends(require_supabase), current_user = Depends(get_current_user)):
    # Enforce admin domain or role
    metadata = getattr(current_user, "user_metadata", {}) or {}
    role = metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    if not (role == "admin" or email.endswith("@taliatech.in")):
        raise HTTPException(status_code=403, detail="Access denied: unauthorized admin view")

    try:
        # Fetch psychometric items
        items_res = client.table("psychometric_items").select("*").execute()
        items = items_res.data or []

        # Fetch assessment responses
        resp_res = client.table("assessment_responses").select("*").execute()
        responses = resp_res.data or []

        # Group responses by question_id
        from collections import defaultdict
        resp_by_item = defaultdict(list)
        for r in responses:
            resp_by_item[r["question_id"]].append(r)

        analysis = []
        for item in items:
            item_id = item["id"]
            stem = item["stem"]
            item_type = item["item_type"]
            dim = item["primary_dimension"]
            
            item_resps = resp_by_item[item_id]
            attempts = len(item_resps)
            
            if attempts == 0:
                success_rate = 0.5  # default/neutral
                status = "Optimal"
                avg_score = 0.0
            else:
                # Calculate success rate / avg score
                logic_raw = item.get("scoring_logic") or {}
                logic_str = logic_raw.get("raw", "") if isinstance(logic_raw, dict) else str(logic_raw or "")
                
                try:
                    logic = parse_scoring_logic(logic_str, item_type)
                except Exception:
                    logic = {}

                if item_type.lower() == "cognitive":
                    correct_ans = str(logic.get("correct_answer") or "")
                    correct_attempts = sum(1 for r in item_resps if str(r["response"]) == correct_ans)
                    success_rate = correct_attempts / attempts
                    avg_score = success_rate
                elif item_type.lower() == "likert":
                    total_score = 0
                    for r in item_resps:
                        try:
                            val = int(r["response"])
                            if logic.get("direction") == "reverse":
                                val = 6 - val
                            total_score += val
                        except ValueError:
                            pass
                    avg_score = total_score / attempts
                    success_rate = avg_score / 5.0  # normalize Likert 1-5 scale to 0-1
                else:  # sjt or other
                    mapping = logic.get("mapping") or {}
                    total_score = 0
                    max_possible = max(mapping.values()) if mapping else 1
                    if max_possible == 0: max_possible = 1
                    for r in item_resps:
                        val = r["response"]
                        if val in mapping:
                            total_score += mapping[val]
                    avg_score = total_score / attempts
                    success_rate = avg_score / max_possible

                # Determine status
                if success_rate < 0.35:
                    status = "Too Hard"
                elif success_rate > 0.85:
                    status = "Too Easy"
                else:
                    status = "Optimal"

            analysis.append({
                "id": item_id,
                "stem": stem[:60] + "..." if len(stem) > 60 else stem,
                "item_type": item_type,
                "dimension": dim,
                "attempts": attempts,
                "success_rate": round(success_rate * 100, 1),
                "status": status
            })

        return analysis
    except Exception as e:
        logger.error(f"ERROR get_item_analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"status": "c2c api root online"}
