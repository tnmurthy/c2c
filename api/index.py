from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import sys
import json
import random

# Add service directories to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, "services", "job-intel-desk", "backend"))

try:
    from agents.scoring_engine import score_job_lead, analyze_candidate, analyze_posting
except ImportError as e:
    print(f"Error importing scoring engine: {e}")

app = FastAPI()

# --- MODELS ---

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

# --- LOGIC COPIED FROM PORTFOLIO_GENERATOR.py (Refactored for JSON) ---

def generate_portfolio_json(portfolio_data):
    ICONS = {
        'computer': 'https://win98icons.alexmeub.com/icons/png/computer_explorer-3.png',
        'folder': 'https://win98icons.alexmeub.com/icons/png/directory_closed-4.png',
        'text': 'https://win98icons.alexmeub.com/icons/png/notepad-5.png',
        'clippy': 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cpath%20d%3D%22M30%2090%20V40%20A10%2010%200%201%201%2050%2040%20V80%20A10%2010%200%201%200%2070%2080%20V30%22%20stroke%3D%22%23808080%22%20fill%3D%22none%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22%2F%3E%3Ccircle%20cx%3D%2235%22%20cy%3D%2230%22%20r%3D%223%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2265%22%20cy%3D%2230%22%20r%3D%223%22%20fill%3D%22black%22%2F%3E%3Cpath%20d%3D%22M30%2020%20Q40%2015%2050%2020%22%20stroke%3D%22black%22%20fill%3D%22none%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M50%2020%20Q60%2015%2070%2020%22%20stroke%3D%22black%22%20fill%3D%22none%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E',
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
        if 'stack' in proj:
            content += f"<p><strong>Stack:</strong> {proj['stack']}</p>"
        if 'url' in proj:
            content += f'<button class="btn-win95" onclick="window.open(\'{proj["url"]}\', \'_blank\')">Visit Site</button>'
        if 'repo' in proj:
            content += f'<button class="btn-win95" onclick="window.open(\'{proj["repo"]}\', \'_blank\')">View Code</button>'
            
        projects_list.append({
            "id": proj["id"],
            "title": proj["title"],
            "icon": ICONS.get(proj["icon"], ICONS['folder']),
            "tooltip": proj.get("tooltip", proj["title"]),
            "content": content
        })
    
    cand = portfolio_data['candidate']
    roles_html = "".join([f"<li>{role}</li>" for role in cand.get('roles', [])])
    resume_item = {
        "id": 'resume',
        "title": 'My Resume',
        "icon": ICONS.get('resume'),
        "tooltip": 'CV & Experience',
        "content": f"""<h3>{cand.get('name', 'Candidate')} - Resume</h3>
        <hr>
        <p><strong>Roles:</strong> {', '.join(cand.get('roles', []))}</p>
        <hr>
        <p><strong>Summary:</strong> {cand.get('summary', '')}</p>
        <hr>
        <p><strong>Expertise:</strong></p>
        <ul>{roles_html}</ul>"""
    }
    projects_list.append(resume_item)

    aboutMeContent = {
        "id": 'about',
        "title": 'About Me',
        "icon": ICONS.get('computer'),
        "content": f"""<h3>{cand.get('name', 'Candidate')}</h3>
        <p><strong>{ " · ".join(cand.get('roles', [])) }</strong></p>
        <hr>
        <p>{cand.get('summary', '')}</p>
        <button class="btn-win95" onclick="window.open('{cand.get('linkedin', '#')}', '_blank')">LinkedIn Profile</button>
        <button class="btn-win95" onclick="window.open('{cand.get('github', '#')}', '_blank')">GitHub</button>"""
    }

    folderMappings = {}
    for proj in portfolio_data['projects']:
        if 'folder' in proj:
            folderMappings[proj['id']] = proj['folder']

    desktopItems = []
    for folder in portfolio_data.get('folders', []):
        desktopItems.append({
            "id": folder['id'],
            "title": folder['title'],
            "icon": ICONS.get(folder['icon'], ICONS['folder']),
            "isFolder": True,
            "tooltip": folder.get('tooltip', folder['title'])
        })
    
    desktopItems.append({ "id": 'dos', "title": 'MS-DOS Prompt', "icon": ICONS.get('terminal'), "isFolder": False, "tooltip": 'Command line interface' })
    desktopItems.append({ "id": 'resume', "title": 'My Resume', "icon": ICONS.get('resume'), "isFolder": False, "tooltip": 'CV & Core Competencies' })
    desktopItems.append({ "id": 'linkedin', "title": 'LinkedIn Profile', "icon": ICONS.get('linkedin'), "isFolder": False, "tooltip": 'Connect with me' })

    return {
        "projects": projects_list,
        "aboutMeContent": aboutMeContent,
        "folderMappings": folderMappings,
        "desktopItems": desktopItems
    }

# --- ENDPOINTS ---

@app.get("/api")
def status():
    return {"status": "c2c api online"}

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
        report = orchestrator.run_ordeal_session()
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio")
async def portfolio(request: PortfolioRequest):
    try:
        portfolio_data = request.dict()
        return generate_portfolio_json(portfolio_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/python")
def hello_world():
    return {"message": "Hello from FastApi"}
