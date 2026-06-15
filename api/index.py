from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import sys
import json
import random
import re

# Add service directories to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, "services", "job-intel-desk", "backend"))
sys.path.append(os.path.join(BASE_DIR, "services", "market-scout"))

try:
    from agents.scoring_engine import score_job_lead, analyze_candidate, analyze_posting
except ImportError:
    pass

# Import Supabase client from existing service structure
try:
    from storage.supabase_sync import get_client
except ImportError:
    def get_client(): return None

app = FastAPI()

# --- CONSTANTS ---

RECOMMENDATION_MAPPING = {
    "Builder": ["Engineer", "Developer", "Researcher", "Architect"],
    "Leader": ["Manager", "Lead", "Culture", "Director"],
    "Rainmaker": ["Sales", "Partnership", "Advocate", "Growth"],
    "Anchor": ["Operations", "QA", "SRE", "DevOps", "Analyst"]
}

# --- MODELS ---

RECOMMENDATION_MAPPING = {
    "Builder": ["Engineer", "Developer", "Researcher", "Architect"],
    "Leader": ["Manager", "Lead", "Culture", "Director"],
    "Rainmaker": ["Sales", "Partnership", "Advocate", "Growth"],
    "Anchor": ["Operations", "QA", "SRE", "DevOps", "Analyst", "Data"]
}

class InstitutionOnboard(BaseModel):
    name: str
    type: str
    domain: str
    location: str

class StudentOnboard(BaseModel):
    full_name: str
    email: str
    graduation_year: int
    department: str

class AssessmentSubmit(BaseModel):
    student_id: str
    responses: List[Dict[str, Any]] # Expected: { "item_id": "...", "response": "..." }

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
        # Parses "B: 4, A: 2, C: 0, D: 1." into a dict
        matches = re.findall(r'([A-E]):\s*(\d+)', logic_str)
        if matches:
            logic["mapping"] = {k: int(v) for k, v in matches}
    elif "likert" in item_type_lower:
        # Detects "High score = high..." and sets direction
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

# --- LOGIC COPIED FROM C2C_ORCHESTRATOR_V2.py ---

class C2C_Orchestrator_V2:
    def __init__(self, candidate_name, audit_gaps):
        self.candidate = candidate_name
        self.gaps = audit_gaps
        self.evidence_scores = {str(gap): 0 for gap in audit_gaps}
        self.logs = []

    def read_audit_gap(self, gap_id):
        return f"Deep-dive data for {gap_id} shows lack of production experience."

    def verify_code_claim(self, feature):
        success = random.choice([True, False])
        return "Found relevant commit history." if success else "No matching commits found."

    def simulate_stress_test(self, gap, difficulty=3):
        performance = random.randint(30, 95)
        return performance

    def run_ordeal_session(self):
        for gap in self.gaps:
            self.read_audit_gap(gap)
            score = self.simulate_stress_test(gap, difficulty=4)
            observation = {
                "status": "success" if score > 70 else "warning",
                "summary": f"Candidate tested on {gap}. Evidence Score: {score}",
                "next_actions": ["Move to next gap"] if score > 70 else ["Re-test with higher difficulty"],
                "evidence_score": score
            }
            self.evidence_scores[str(gap)] = score
            self.logs.append(observation)
        return self.finalize_session()

    def finalize_session(self):
        passed = all(score >= 70 for score in self.evidence_scores.values())
        report = {
            "candidate": self.candidate,
            "final_status": "CERTIFIED" if passed else "REMEDIATION_REQUIRED",
            "evidence_scores": self.evidence_scores,
            "convergence_met": passed,
            "logs": self.logs
        }
        return report

def generate_portfolio_json(portfolio_data):
    ICONS = {
        'computer': 'https://win98icons.alexmeub.com/icons/png/computer_explorer-3.png',
        'folder': 'https://win98icons.alexmeub.com/icons/png/directory_closed-4.png',
        'text': 'https://win98icons.alexmeub.com/icons/png/notepad-5.png',
        'video': 'https://win98icons.alexmeub.com/icons/png/media_player-0.png',
        'gear': 'https://win98icons.alexmeub.com/icons/png/settings_gear-3.png',
        'msn': 'https://win98icons.alexmeub.com/icons/png/msn.png',
        'chart': 'https://win98icons.alexmeub.com/icons/png/chart1-0.png',
        'html': 'https://win98icons.alexmeub.com/icons/png/html-1.png',
        'world': 'https://win98icons.alexmeub.com/icons/png/world-0.png',
        'network': 'https://win98icons.alexmeub.com/icons/png/world_network_directories-3.png',
        'camera': 'https://win98icons.alexmeub.com/icons/png/camera-0.png',
        'certificate': 'https://win98icons.alexmeub.com/icons/png/certificate-0.png',
        'brain': 'https://win98icons.alexmeub.com/icons/png/entire_network_globe-3.png',
        'robot': 'https://win98icons.alexmeub.com/icons/png/computer_gear.png',
        'product': 'https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png',
        'strategy': 'https://win98icons.alexmeub.com/icons/png/check-0.png',
        'linkedin': 'https://win98icons.alexmeub.com/icons/png/msie1-2.png',
        'resume': 'https://win98icons.alexmeub.com/icons/png/notepad-4.png',
        'briefcase': 'https://win98icons.alexmeub.com/icons/png/briefcase-0.png',
        'book': 'https://win98icons.alexmeub.com/icons/png/help_book_big-0.png',
        'database': 'https://win98icons.alexmeub.com/icons/png/cylinder_database-1.png',
        'shield': 'https://win98icons.alexmeub.com/icons/png/key_padlock-0.png',
        'search': 'https://win98icons.alexmeub.com/icons/png/search_file-0.png',
        'finance': 'https://win98icons.alexmeub.com/icons/png/chart1-0.png',
        'terminal': 'https://win98icons.alexmeub.com/icons/png/ms_dos-0.png',
        'pipe': 'https://win98icons.alexmeub.com/icons/png/recycle_bin_full-4.png'
    }
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

# --- ENDPOINTS ---

@app.get("/api")
def status():
    return {"status": "c2c api online"}

@app.post("/api/onboard/institution")
async def onboard_institution(inst: InstitutionOnboard):
    client = get_client()
    if not client: raise HTTPException(status_code=500, detail="Supabase client not initialized")
    try:
        res = client.table("institutions").upsert(inst.dict(), on_conflict="domain").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/onboard/student")
async def onboard_student(student: StudentOnboard):
    client = get_client()
    if not client: raise HTTPException(status_code=500, detail="Supabase client not initialized")
    domain = student.email.split("@")[-1]
    inst_res = client.table("institutions").select("*").eq("domain", domain).execute()
    if not inst_res.data:
        raise HTTPException(status_code=400, detail="Institution domain not registered")
    try:
        data = student.dict()
        data["institution_id"] = inst_res.data[0]["id"]
        res = client.table("students").insert(data).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assessment/generate")
async def generate_assessment(num_per_section: int = 25):
    client = get_client()
    if not client: raise HTTPException(status_code=500, detail="Supabase client not initialized")
    dimensions = ["IQ", "EQ", "SQ", "AQ", "SpQ"]
    final_items = []
    try:
        for dim in dimensions:
            res = client.table("psychometric_items").select("*").eq("primary_dimension", dim).execute()
            items = res.data
            if items:
                count = min(len(items), random.randint(25, 30) if num_per_section == 25 else num_per_section)
                final_items.extend(random.sample(items, count))
        return final_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/assessment/submit")
async def submit_assessment(submit: AssessmentSubmit):
    client = get_client()
    if not client: raise HTTPException(status_code=500, detail="Supabase client not initialized")
    scores = {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}
    try:
        item_ids = [r["item_id"] for r in submit.responses]
        items_res = client.table("psychometric_items").select("*").in_("id", item_ids).execute()
        items_map = {item["id"]: item for item in items_res.data}
        
        for resp in submit.responses:
            item = items_map.get(resp["item_id"])
            if not item: continue
            
            val, dim = resp["response"], item["primary_dimension"]
            
            # Robust scoring_logic retrieval
            logic_raw = item.get("scoring_logic")
            if isinstance(logic_raw, dict):
                logic_str = logic_raw.get("raw", "")
            else:
                logic_str = str(logic_raw) if logic_raw is not None else ""
                
            logic = parse_scoring_logic(logic_str, item["item_type"])
            
            if item["item_type"].lower() == "likert":
                try:
                    score = int(val)
                    if logic.get("direction") == "reverse": score = 6 - score
                    scores[dim] += score
                except ValueError: pass
            elif item["item_type"].lower() == "cognitive":
                if str(val) == str(logic.get("correct_answer")): scores[dim] += 1
            elif "sjt" in item["item_type"].lower():
                mapping = logic.get("mapping") or {}
                if val in mapping:
                    scores[dim] += mapping[val]
        
        # Map scores to 'Primary Founder Profile'
        # Builder: High IQ+AQ, Leader: High EQ+SQ, Rainmaker: High SQ+AQ, Anchor: High IQ+EQ
        founder_fit = {
            "Builder": scores.get("IQ", 0) + scores.get("AQ", 0),
            "Leader": scores.get("EQ", 0) + scores.get("SQ", 0),
            "Rainmaker": scores.get("SQ", 0) + scores.get("AQ", 0),
            "Anchor": scores.get("IQ", 0) + scores.get("EQ", 0)
        }
        primary_profile = max(founder_fit, key=founder_fit.get)
        
        development_report = generate_development_report(scores, primary_profile)
        
        result_payload = {
            "student_id": submit.student_id, 
            "dimension_scores": scores, 
            "founder_fit": founder_fit,
            "primary_profile": primary_profile,
            "development_report": development_report
        }
        client.table("assessments").insert(result_payload).execute()
        return result_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cohort/{institution_id}")
async def get_cohort_report(institution_id: str):
    client = get_client()
    if not client: raise HTTPException(status_code=500, detail="Supabase client not initialized")
    try:
        students_res = client.table("students").select("id").eq("institution_id", institution_id).execute()
        if not students_res.data:
            return {"averages": {}, "founder_distribution": {}, "support_needs": []}
            
        student_ids = [s["id"] for s in students_res.data]
        
        assessments_res = client.table("assessments").select("*").in_("student_id", student_ids).execute()
        assessments = assessments_res.data
        
        if not assessments:
            return {"averages": {}, "founder_distribution": {}, "support_needs": []}
            
        total_students = len(assessments)
        sums = {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}
        profile_counts = {"Builder": 0, "Leader": 0, "Rainmaker": 0, "Anchor": 0}
        
        for a in assessments:
            scores = a.get("dimension_scores", {})
            for dim in sums.keys():
                sums[dim] += scores.get(dim, 0)
                
            profile = a.get("primary_profile")
            if profile in profile_counts:
                profile_counts[profile] += 1
                
        averages = {dim: total / total_students for dim, total in sums.items()}
        founder_distribution = {prof: (count / total_students) * 100 for prof, count in profile_counts.items()}
        
        support_needs = []
        if averages.get("AQ", 0) < 50:
            support_needs.append("Cohort average AQ is below 50. Consider implementing resilience and stress-management workshops.")
        if averages.get("IQ", 0) < 50:
            support_needs.append("Cohort average IQ is below 50. Evaluate if core curriculum needs reinforcement.")
        if averages.get("EQ", 0) < 50:
            support_needs.append("Cohort average EQ is below 50. Encourage teamwork, communication, and empathy training.")
        if averages.get("SQ", 0) < 50:
            support_needs.append("Cohort average SQ is below 50. Recommend more social engagement and networking opportunities.")
            
        return {
            "averages": averages,
            "founder_distribution": founder_distribution,
            "support_needs": support_needs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads")
async def get_leads():
    client = get_client()
    if not client: raise HTTPException(status_code=500, detail="Supabase client not initialized")
    try:
        res = client.table("market_leads").select("*").order("ai_score", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/student/{student_id}")
async def get_student(student_id: str):
    client = get_client()
    if not client: raise HTTPException(status_code=500, detail="Supabase client not initialized")
    try:
        student_res = client.table("students").select("*").eq("id", student_id).execute()
        if not student_res.data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        assessment_res = client.table("assessments").select("*").eq("student_id", student_id).execute()
        return {
            "student": student_res.data[0],
            "assessments": assessment_res.data
        }
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audit")
async def audit(request: AuditRequest):
    try:
        result = score_job_lead(request.job_description, request.candidate)
        return result.as_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ordeal")
async def ordeal(request: OrdealRequest):
    try:
        orchestrator = C2C_Orchestrator_V2(request.candidate_name, request.gaps)
        return orchestrator.run_ordeal_session()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio")
async def portfolio(request: PortfolioRequest):
    try:
        return generate_portfolio_json(request.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

