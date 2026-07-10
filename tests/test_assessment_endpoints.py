import unittest
import uuid
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load remote Supabase credentials from .env.local
load_dotenv(".env.local")

from fastapi.testclient import TestClient
from fastapi import status

from api.main import app
from api.deps import get_current_user, require_admin_supabase, require_role
from api.routers.assessment_router import generate_development_report

# Setup FastAPI test client
client = TestClient(app)

class MockUser:
    def __init__(self, id, email, role):
        self.id = id
        self.email = email
        self.user_metadata = {"role": role, "profile_id": id}
        self.app_metadata = {"role": role, "profile_id": id}

def get_mock_student_user():
    return MockUser("test-student-uuid", "test_student@example.com", "student")

class TestAssessmentHardened(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_current_user] = get_mock_student_user

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_get_assessment_bank(self):
        response = client.get("/api/assessment/bank?page=1&limit=5")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertIn("limit", data)
        self.assertIn("items", data)
        self.assertLessEqual(len(data["items"]), 5)
        
        # Test filtering by dimension
        response_dim = client.get("/api/assessment/bank?page=1&limit=5&dimension=AQ")
        self.assertEqual(response_dim.status_code, 200)
        data_dim = response_dim.json()
        for item in data_dim["items"]:
            self.assertEqual(item["primary_dimension"], "AQ")

    def test_development_report_spq_integration(self):
        # SpQ > 75
        scores_high = {"IQ": 80, "EQ": 80, "SQ": 80, "AQ": 80, "SpQ": 85}
        report_high = generate_development_report(scores_high, "Builder")
        self.assertTrue(any("Purpose-driven leadership" in feedback for feedback in report_high["actionable_feedback"]))
        
        # SpQ < 40
        scores_low = {"IQ": 80, "EQ": 80, "SQ": 80, "AQ": 80, "SpQ": 35}
        report_low = generate_development_report(scores_low, "Builder")
        self.assertTrue(any("value-alignment reflection" in feedback for feedback in report_low["actionable_feedback"]))

    def test_assessment_session_and_cooldown_lifecycle(self):
        db_client = require_admin_supabase()
        
        # Create test resources
        tenant_id = str(uuid.uuid4())
        student_id = str(uuid.uuid4())
        
        try:
            # 1. Seed a test tenant
            tenant_payload = {
                "tenant_id": tenant_id,
                "name": "E2E Cooldown Test Tenant",
                "slug": f"cooldown-test-{uuid.uuid4().hex[:6]}",
                "status": "active",
                "retake_cooldown_days": 90
            }
            db_client.table("tenants").insert(tenant_payload).execute()
            
            # 2. Seed a test student linked to this tenant
            student_payload = {
                "id": student_id,
                "full_name": "Test Cooldown Student",
                "email": f"cooldown_student_{uuid.uuid4().hex[:6]}@example.com",
                "graduation_year": 2026,
                "department": "Computer Science",
                "tenant_id": tenant_id
            }
            db_client.table("students").insert(student_payload).execute()
            
            # Override the mock student user metadata to use our seeded student_id
            def get_current_seeded_student():
                return MockUser(student_id, student_payload["email"], "student")
                
            app.dependency_overrides[get_current_user] = get_current_seeded_student
            app.dependency_overrides[require_role(["student", "admin"])] = get_current_seeded_student
            
            # 3. Start a new session
            start_payload = {"student_id": student_id}
            response = client.post("/api/assessment/session/start", json=start_payload)
            self.assertEqual(response.status_code, 200)
            session_data = response.json()
            self.assertEqual(session_data["status"], "in_progress")
            self.assertEqual(session_data["last_question_index"], 0)
            self.assertGreater(len(session_data["questions"]), 0)
            session_id = session_data["session_id"]
            
            # 4. Resume the session (calling start again should return the active session)
            response_resume = client.post("/api/assessment/session/start", json=start_payload)
            self.assertEqual(response_resume.status_code, 200)
            resume_data = response_resume.json()
            self.assertEqual(resume_data["session_id"], session_id)
            self.assertEqual(resume_data["status"], "in_progress")
            
            # 5. Answer a question
            first_q = session_data["questions"][0]
            answer_payload = {
                "item_id": first_q["id"],
                "response": "5" if first_q.get("item_type") == "likert" else "A"
            }
            response_answer = client.patch(f"/api/assessment/session/{session_id}/answer", json=answer_payload)
            self.assertEqual(response_answer.status_code, 200)
            answer_data = response_answer.json()
            self.assertEqual(answer_data["last_question_index"], 1)
            self.assertEqual(len(answer_data["responses_json"]), 1)
            self.assertEqual(answer_data["responses_json"][0]["item_id"], first_q["id"])
            
            # 6. Submit the final assessment
            submit_responses = []
            for q in session_data["questions"]:
                submit_responses.append({
                    "item_id": q["id"],
                    "response": "4" if q.get("item_type") == "likert" else "A"
                })
                
            submit_payload = {
                "student_id": student_id,
                "responses": submit_responses
            }
            response_submit = client.post("/api/assessment/submit", json=submit_payload)
            self.assertEqual(response_submit.status_code, 200)
            submit_data = response_submit.json()
            self.assertIn("dimension_scores", submit_data)
            self.assertIn("percentile_bands", submit_data)
            self.assertIn("founder_fit", submit_data)
            
            self.assertIn("SpQ", submit_data["dimension_scores"])
            self.assertIn("SpQ", submit_data["percentile_bands"])
            
            # 7. Check that the session in DB is now 'completed'
            sess_db = db_client.table("assessment_sessions").select("status").eq("id", session_id).execute()
            self.assertEqual(sess_db.data[0]["status"], "completed")
            
            # 8. Start session again (should trigger cooldown 429)
            response_cooldown = client.post("/api/assessment/session/start", json=start_payload)
            self.assertEqual(response_cooldown.status_code, 429)
            cooldown_data = response_cooldown.json()
            self.assertIn("cooldown_until", cooldown_data)
            self.assertIn("Assessment cooldown active", cooldown_data["detail"])
            
            # 9. Submit again (should trigger cooldown 429)
            response_submit_cooldown = client.post("/api/assessment/submit", json=submit_payload)
            self.assertEqual(response_submit_cooldown.status_code, 429)
            
        finally:
            try:
                db_client.table("assessment_sessions").delete().eq("student_id", student_id).execute()
            except Exception:
                pass
            try:
                db_client.table("assessments").delete().eq("student_id", student_id).execute()
            except Exception:
                pass
            try:
                db_client.table("students").delete().eq("id", student_id).execute()
            except Exception:
                pass
            try:
                db_client.table("tenants").delete().eq("tenant_id", tenant_id).execute()
            except Exception:
                pass

    def test_generate_items_admin(self):
        # Override user as admin
        app.dependency_overrides[get_current_user] = lambda: MockUser("test-admin-uuid", "admin@example.com", "admin")
        
        try:
            payload = {
                "dimension": "EQ",
                "item_type": "SJT",
                "context": "conflict resolution",
                "count": 1
            }
            response = client.post("/api/admin/generate-items", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "success")
            self.assertTrue(len(data["generated_items"]) > 0)
            
            # Clean up the generated item from DB
            generated_id = data["generated_items"][0]["id"]
            db_client = require_admin_supabase()
            db_client.table("psychometric_items").delete().eq("id", generated_id).execute()
        finally:
            app.dependency_overrides[get_current_user] = get_mock_student_user

if __name__ == "__main__":
    unittest.main()
