import unittest
import psycopg2

class TestRLSPolicies(unittest.TestCase):
    def setUp(self):
        self.db_url = 'postgresql://postgres:s7r1h6s6p5!@db.onsmkbwqucvbzggugmmn.supabase.co:5432/postgres'
        try:
            self.conn = psycopg2.connect(self.db_url)
        except Exception as e:
            self.skipTest(f"Database connection unavailable: {e}")

    def tearDown(self):
        if hasattr(self, "conn") and self.conn:
            self.conn.close()

    def test_students_policies_exist(self):
        cur = self.conn.cursor()
        cur.execute("SELECT policyname FROM pg_policies WHERE tablename = 'students';")
        policies = [r[0] for r in cur.fetchall()]
        cur.close()
        
        self.assertIn("students_select_policy", policies)
        self.assertIn("students_insert_policy", policies)
        self.assertIn("students_update_policy", policies)
        self.assertIn("students_delete_policy", policies)
        self.assertNotIn("permissive_policy", policies)

    def test_assessments_policies_exist(self):
        cur = self.conn.cursor()
        cur.execute("SELECT policyname FROM pg_policies WHERE tablename = 'assessments';")
        policies = [r[0] for r in cur.fetchall()]
        cur.close()
        
        self.assertIn("assessments_select_policy", policies)
        self.assertIn("assessments_insert_policy", policies)
        self.assertNotIn("permissive_policy", policies)

    def test_market_leads_policies_exist(self):
        cur = self.conn.cursor()
        cur.execute("SELECT policyname FROM pg_policies WHERE tablename = 'market_leads';")
        policies = [r[0] for r in cur.fetchall()]
        cur.close()
        
        self.assertIn("market_leads_select_policy", policies)
        self.assertIn("market_leads_write_policy", policies)
        self.assertNotIn("permissive_policy", policies)

if __name__ == "__main__":
    unittest.main()
