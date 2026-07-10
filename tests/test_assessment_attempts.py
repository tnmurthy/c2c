import unittest
import uuid
from dotenv import load_dotenv

# Load remote Supabase credentials from .env.local
load_dotenv(".env.local")

from api.deps import require_admin_supabase

class TestAssessmentAttempts(unittest.TestCase):
    def setUp(self):
        self.client = require_admin_supabase()
        if not self.client:
            self.skipTest("Supabase client is not configured.")
        
        self.student_id = str(uuid.uuid4())
        self.tenant_id = str(uuid.uuid4())
        
        # Create a mock tenant and student for foreign key constraints
        self.client.table("tenants").insert({
            "tenant_id": self.tenant_id,
            "name": "Test Attempts Tenant",
            "slug": f"test-attempts-{uuid.uuid4().hex[:6]}",
            "status": "active"
        }).execute()
        
        self.client.table("students").insert({
            "id": self.student_id,
            "full_name": "Attempts Test Student",
            "email": f"attempts_student_{uuid.uuid4().hex[:6]}@example.com",
            "graduation_year": 2026,
            "department": "Computer Science",
            "tenant_id": self.tenant_id
        }).execute()

    def tearDown(self):
        # Cleanup
        try:
            self.client.table("assessment_attempts").delete().eq("student_id", self.student_id).execute()
        except Exception:
            pass
        try:
            self.client.table("assessments").delete().eq("student_id", self.student_id).execute()
        except Exception:
            pass
        try:
            self.client.table("students").delete().eq("id", self.student_id).execute()
        except Exception:
            pass
        try:
            self.client.table("tenants").delete().eq("tenant_id", self.tenant_id).execute()
        except Exception:
            pass

    def test_attempts_increment_and_sync_trigger(self):
        # 1. Insert first attempt
        payload1 = {
            "student_id": self.student_id,
            "dimension_scores": {"IQ": 80, "EQ": 70, "SQ": 60, "AQ": 50, "SpQ": 40},
            "founder_fit": {"Builder": 130, "Leader": 130, "Rainmaker": 110, "Anchor": 150},
            "primary_profile": "Anchor",
            "development_report": {"notes": "Attempt 1 feedback"},
            "tech_fit_index": 75.0,
            "sales_fit_index": 62.5
        }
        res1 = self.client.table("assessment_attempts").insert(payload1).execute()
        self.assertTrue(len(res1.data) > 0)
        self.assertEqual(res1.data[0]["attempt_number"], 1)

        # 2. Check if assessments table was updated/synced automatically via trigger
        sync1 = self.client.table("assessments").select("*").eq("student_id", self.student_id).execute()
        self.assertTrue(len(sync1.data) > 0)
        self.assertEqual(sync1.data[0]["primary_profile"], "Anchor")
        self.assertEqual(sync1.data[0]["dimension_scores"]["IQ"], 80)

        # 3. Insert second attempt
        payload2 = {
            "student_id": self.student_id,
            "dimension_scores": {"IQ": 90, "EQ": 80, "SQ": 70, "AQ": 60, "SpQ": 50},
            "founder_fit": {"Builder": 150, "Leader": 150, "Rainmaker": 130, "Anchor": 170},
            "primary_profile": "Builder",
            "development_report": {"notes": "Attempt 2 feedback"},
            "tech_fit_index": 85.0,
            "sales_fit_index": 72.5
        }
        res2 = self.client.table("assessment_attempts").insert(payload2).execute()
        self.assertTrue(len(res2.data) > 0)
        self.assertEqual(res2.data[0]["attempt_number"], 2)

        # 4. Check if assessments table was updated to latest attempt via trigger
        sync2 = self.client.table("assessments").select("*").eq("student_id", self.student_id).execute()
        self.assertTrue(len(sync2.data) > 0)
        self.assertEqual(sync2.data[0]["primary_profile"], "Builder")
        self.assertEqual(sync2.data[0]["dimension_scores"]["IQ"], 90)

if __name__ == "__main__":
    unittest.main()
