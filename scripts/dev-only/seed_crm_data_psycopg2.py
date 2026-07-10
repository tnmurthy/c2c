import os
import sys
import uuid
import random
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values

# Reconfigure stdout/stderr to support Unicode (emojis) in Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

DB_URL = "postgresql://postgres:s7r1h6s6p5!@db.onsmkbwqucvbzggugmmn.supabase.co:5432/postgres"

def seed_data():
    print("Starting CRM data seed with psycopg2...")
    
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    try:
        # 1. Create Tenant
        tenant_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO tenants (tenant_id, name, slug, status) VALUES (%s, %s, %s, %s)",
            (tenant_id, "C2C Demo Tenant", f"c2c-demo-{random.randint(1000, 9999)}", "active")
        )
        print("Created Tenant")

        # 2. Create User
        user_id = str(uuid.uuid4())
        try:
            cur.execute(
                "INSERT INTO crm_users (user_id, tenant_id, email, name, status) VALUES (%s, %s, %s, %s, %s)",
                (user_id, tenant_id, "demo_admin@example.com", "Demo Admin", "active")
            )
            print("Created CRM User")
        except Exception as e:
            print("Skipping crm_users insert:", e)

        # 3. Create Pipeline & Stages
        pipeline_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO pipelines (pipeline_id, tenant_id, name, entity_type, is_default) VALUES (%s, %s, %s, %s, %s)",
            (pipeline_id, tenant_id, "Default Sales", "opportunity", True)
        )
        
        stages = [
            ("New Deal", 1), ("Contacted", 2), ("Demo Given", 3), 
            ("Negotiation", 4), ("Won", 5)
        ]
        stage_ids = []
        for name, seq in stages:
            s_id = str(uuid.uuid4())
            stage_ids.append(s_id)
            cur.execute(
                "INSERT INTO pipeline_stages (stage_id, tenant_id, pipeline_id, name, sequence) VALUES (%s, %s, %s, %s, %s)",
                (s_id, tenant_id, pipeline_id, name, seq)
            )
        print("Created Pipeline and Stages")

        # 4. Create Accounts
        accounts_to_create = [
            {"name": "University 1", "type": "college", "industry": "Education", "location": "Austin"},
            {"name": "College South 1", "type": "college", "industry": "Education", "location": "Dallas"},
            {"name": "College Village North 2", "type": "college", "industry": "Education", "location": "Chicago"},
            {"name": "Tech Corp Alpha", "type": "company", "industry": "Technology", "location": "San Jose"},
            {"name": "Global Finance Partners", "type": "company", "industry": "Finance", "location": "New York"},
            {"name": "State University Engineering", "type": "college", "industry": "Education", "location": "Columbus"},
            {"name": "HealthTech Solutions", "type": "company", "industry": "Healthcare", "location": "Boston"},
            {"name": "Community College West", "type": "college", "industry": "Education", "location": "Seattle"},
            {"name": "Retail Giants Inc", "type": "company", "industry": "Retail", "location": "Bentonville"},
            {"name": "Design Studio Pro", "type": "company", "industry": "Services", "location": "Los Angeles"},
        ]
        account_ids = []
        for acc in accounts_to_create:
            acc_id = str(uuid.uuid4())
            account_ids.append(acc_id)
            cur.execute(
                "INSERT INTO accounts (account_id, tenant_id, name, type, industry, city, owner_id) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (acc_id, tenant_id, acc["name"], acc["type"], acc["industry"], acc["location"], user_id)
            )
        print(f"Created {len(account_ids)} Accounts")

        # 5. Create Contacts
        contact_names = ["John Smith", "Emma Davis", "Michael Brown", "Sarah Wilson", "David Taylor", "Lisa Anderson", "James Thomas", "Jennifer Martinez", "Robert Garcia", "Maria Robinson"]
        contact_ids = []
        for i, name in enumerate(contact_names):
            first, last = name.split(' ')
            c_id = str(uuid.uuid4())
            contact_ids.append(c_id)
            cur.execute(
                "INSERT INTO contacts (contact_id, tenant_id, account_id, first_name, last_name, email, role, owner_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (c_id, tenant_id, account_ids[i], first, last, f"{first.lower()}.{last.lower()}@example.com", random.choice(["student", "faculty", "placement_officer", "HR"]), user_id)
            )
        print(f"Created {len(contact_ids)} Contacts")

        # 6. Create Opportunities
        opp_types = ["Campus Training", "Corporate Workshop", "Bulk Placement", "SaaS Licensing", "Consulting Project"]
        for i in range(15):
            acc_idx = random.randint(0, len(account_ids)-1)
            cur.execute(
                "INSERT INTO opportunities (opportunity_id, tenant_id, account_id, primary_contact_id, owner_id, name, pipeline_id, stage_id, amount, currency, probability, expected_close_date, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (str(uuid.uuid4()), tenant_id, account_ids[acc_idx], contact_ids[acc_idx], user_id, f"{accounts_to_create[acc_idx]['name']} - {random.choice(opp_types)}", pipeline_id, random.choice(stage_ids), float(random.randint(5000, 150000)), "USD", random.choice([10, 30, 50, 80, 100]), (datetime.now() + timedelta(days=random.randint(10, 90))).strftime("%Y-%m-%d"), "open")
            )
        print("Created 15 Opportunities")

        # 7. Create Leads
        lead_sources = ["website", "referral", "event", "campaign"]
        for i in range(12):
            cur.execute(
                "INSERT INTO leads (lead_id, tenant_id, owner_id, first_name, last_name, email, source, status, account_name, interest_area) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (str(uuid.uuid4()), tenant_id, user_id, f"LeadFirst{i}", f"LeadLast{i}", f"lead{i}@example.org", random.choice(lead_sources), random.choice(["new", "contacted", "qualified"]), f"Prospective Company {i}", random.choice(["Data Science", "Web Dev", "Soft Skills", "Placements"]))
            )
        print("Created 12 Leads")
        
        conn.commit()
        print(f"\nSeed Complete! Your active tenant_id is: {tenant_id}")
        
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo_tenant_id.txt"), "w") as f:
            f.write(tenant_id)
            
    except Exception as e:
        conn.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_data()
