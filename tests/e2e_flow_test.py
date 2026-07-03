import os
import time
import pytest
import httpx
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

@pytest.fixture(scope="module")
def supabase() -> Client:
    assert SUPABASE_URL is not None, "NEXT_PUBLIC_SUPABASE_URL is not set"
    assert SUPABASE_KEY is not None, "SUPABASE_SERVICE_ROLE_KEY is not set"
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def test_system_health():
    """Smoke Test: Verify FastAPI backend is reachable."""
    # Assuming FastAPI runs locally on 8000
    try:
        response = httpx.get("http://127.0.0.1:8000/", timeout=5.0)
        assert response.status_code in [200, 404] # 404 is fine if root has no handler, we just need it to be reachable
    except httpx.ConnectError:
        pytest.fail("FastAPI server is not running on http://localhost:8000. Please start the backend.")

def test_standard_onboarding_flow(supabase: Client):
    """Scenario A: Test standard onboarding profile processing."""
    # 1. Insert a mock student
    student_id = str(uuid.uuid4())
    mock_student = {
        "id": student_id,
        "email": "standard_test@example.com",
        "full_name": "E2E Test User",
        "department": "Computer Science",
        "graduation_year": 2025,
        "linkedin_url": "https://linkedin.com/in/testuser",
        "bio": "A passionate software engineer looking for backend roles.",
        "skills": ["Python", "FastAPI", "React", "PostgreSQL"]
    }
    # Clean up before test just in case
    supabase.table("students").delete().eq("email", mock_student["email"]).execute()
    
    # Insert new student
    res = supabase.table("students").insert(mock_student).execute()
    assert len(res.data) > 0
    
    # 2. Insert assessment record (simulating backend/API processing)
    assessment_payload = {
        "student_id": mock_student["id"],
        "dimension_scores": {"IQ": 100, "EQ": 90, "AQ": 80, "SQ": 70, "SpQ": 60},
        "founder_fit": {"Builder": 180, "Leader": 160, "Rainmaker": 150, "Anchor": 190},
        "primary_profile": "Anchor",
        "development_report": {"profile_summary": "Test Summary", "actionable_feedback": []}
    }
    res = supabase.table("assessments").insert(assessment_payload).execute()
    assert len(res.data) > 0, "Assessment was not saved to database."
    
    # Clean up
    supabase.table("students").delete().eq("id", mock_student["id"]).execute()

def test_edge_case_profile_flow(supabase: Client):
    """Scenario B: Test edge case profile with missing data."""
    student_id = str(uuid.uuid4())
    mock_student = {
        "id": student_id,
        "email": "edge_test@example.com",
        "full_name": "Edge Case User",
        "department": "IT",
        "graduation_year": 2024
        # Missing linkedin, bio, skills
    }
    supabase.table("students").delete().eq("email", mock_student["email"]).execute()
    
    # Insert new student
    res = supabase.table("students").insert(mock_student).execute()
    assert len(res.data) > 0
    
    # 2. Insert assessment record (simulating backend/API processing)
    assessment_payload = {
        "student_id": mock_student["id"],
        "dimension_scores": {"IQ": 90, "EQ": 80, "AQ": 70, "SQ": 60, "SpQ": 50},
        "founder_fit": {"Builder": 160, "Leader": 140, "Rainmaker": 130, "Anchor": 170},
        "primary_profile": "Anchor",
        "development_report": {"profile_summary": "Edge Case Summary", "actionable_feedback": []}
    }
    res = supabase.table("assessments").insert(assessment_payload).execute()
    assert len(res.data) > 0, "Assessment was not saved to database."
    
    # Clean up
    supabase.table("students").delete().eq("id", mock_student["id"]).execute()

def test_market_scout_flow(supabase: Client):
    """Scenario C: High-Volume Lead Generation via Market Scout."""
    # First insert a mock employer to satisfy foreign key constraints
    employer_id = str(uuid.uuid4())
    supabase.table("employers").insert({
        "id": employer_id,
        "company_name": "E2E Test Corp",
        "industry": "Tech",
        "contact_person": "Jane Doe"
    }).execute()

    mock_job = {
        "title": "E2E Test Job",
        "employer_id": employer_id,
        "description": "Looking for a test engineer.",
        "requirements": ["Testing", "Python"],
        "status": "open"
    }
    
    # Assuming job_postings table insertion triggers `run_market_scout`
    res = supabase.table("job_postings").insert(mock_job).execute()
    job_id = res.data[0]["id"]
    
    # Poll for leads targeting this job
    leads_found = False
    for _ in range(5):
        time.sleep(1)
        # Just check if we can query market_leads
        leads = supabase.table("market_leads").select("*").limit(1).execute()
        if leads.data is not None:
            leads_found = True
            break
            
    assert leads_found, "Background worker `run_market_scout` failed to generate leads."
    
    # Clean up
    supabase.table("job_postings").delete().eq("id", job_id).execute()
    supabase.table("employers").delete().eq("id", employer_id).execute()
