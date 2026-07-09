import os
import sys
import shutil
import subprocess
import http.server
import socketserver
import threading
import time
import json

# Get the directory of the current script (scripts)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Get the project root directory
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# Add project root and other necessary backend paths to sys.path
sys.path.append(PROJECT_ROOT)
sys.path.append(os.path.join(PROJECT_ROOT, "services", "job-intel-desk", "backend"))

try:
    from scripts.orchestrator import generate_ordeal_prompt
    from scripts.portfolio_generator import generate_projects_js
except ImportError as e:
    # If not in path, we'll try to import relatively
    print(f"Warning: Direct imports failed: {e}. Ensure you are in the project root.")

def run_pipeline(candidate_file, jd_file):
    print("👔 STARTING campus2corporate (c2c) PIPELINE...")
    
    # 1. Load Data
    try:
        with open(candidate_file, "r") as f:
            candidate_data = json.load(f)
        with open(jd_file, "r") as f:
            jd_text = f.read()
    except Exception as e:
        print(f"❌ Error loading input files: {e}")
        return

    # 2. Phase 1 & 2: Audit -> Ordeal
    print("🔍 Auditing candidate and generating Ordeal Mission...")
    ordeal_prompt = generate_ordeal_prompt(candidate_data, jd_text)
    with open(os.path.join(PROJECT_ROOT, "ORDEAL_PROMPT.md"), "w", encoding="utf-8") as f:
        f.write(ordeal_prompt)
    print("✅ Ordeal Prompt generated: ORDEAL_PROMPT.md")

    # 3. Phase 3: The Makeover (Simulated here)
    print("✨ Refining candidate profile into Professional Legend...")
    # In a real scenario, this would be updated based on Ordeal results.
    # For now, we use the candidate data to generate the portfolio.
    
    # Mocking a refined portfolio structure for Unit 3 tool
    portfolio_data = {
        "candidate": {
            "name": candidate_data.get("candidate", {}).get("name", "Unknown"),
            "summary": candidate_data.get("candidate", {}).get("summary", "AI Specialist"),
            "roles": [s["name"] for s in candidate_data.get("skills", [])[:3] if "name" in s],
            "linkedin": candidate_data.get("identity", {}).get("linkedin_url", "#"),
            "github": candidate_data.get("identity", {}).get("github_url", "#")
        },
        "projects": [
            {
                "id": p.get("title", "proj").lower().replace(" ", "-"),
                "title": p.get("title", "Project"),
                "icon": "gear",
                "impact": p.get("impact", "Significant technical impact."),
                "stack": p.get("stack", "N/A"),
                "folder": "featured"
            } for p in candidate_data.get("projects", [])
        ],
        "folders": [
            { "id": "featured", "title": "Featured Work", "icon": "folder" }
        ]
    }
    
    # 4. Phase 4: Launch (Deploy to brand-optimizer)
    print("🚀 Deploying to Brand Optimizer...")
    js_content = generate_projects_js(portfolio_data)
    target_path = os.path.join(PROJECT_ROOT, "services", "brand-optimizer", "homepage", "projects.js")
    
    # Backup original
    if os.path.exists(target_path) and not os.path.exists(target_path + ".bak"):
        shutil.copy(target_path, target_path + ".bak")
        
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"✅ Portfolio deployed to {target_path}")
    print("\n--- C2C TRANSFORMATION COMPLETE ---")

def serve_portfolio():
    PORT = 9595
    DIRECTORY = os.path.join(PROJECT_ROOT, "services", "brand-optimizer", "homepage")
    
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=DIRECTORY, **kwargs)

    print(f"\n🌐 Launching Local Portfolio Server at: http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.shutdown()

if __name__ == "__main__":
    import json
    
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        serve_portfolio()
    else:
        # Default run with sample data if no files provided
        sample_cand = os.path.join(PROJECT_ROOT, "services", "job-intel-desk", "backend", "data", "profile_schema_example.json")
        
        # Create a dummy JD for the demo
        demo_jd_path = os.path.join(PROJECT_ROOT, "DEMO_JD.txt")
        with open(demo_jd_path, "w") as f:
            f.write("Full-Stack Engineer with Python and React experience.")
            
        run_pipeline(sample_cand, demo_jd_path)
        print("\n💡 Run 'python C2C_AGENCY.py serve' to view the portfolio.")
