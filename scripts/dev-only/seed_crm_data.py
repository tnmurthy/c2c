import os
import sys
import uuid
import random
from datetime import datetime, timedelta

# Reconfigure stdout/stderr to support Unicode (emojis) in Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Add parent directory to path so we can import modules if needed, or we just load .env directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env.local"))

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use service role for seeding

if not url or not key:
    print("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
    sys.exit(1)

supabase: Client = create_client(url, key)

def seed_data():
    print("Starting CRM data seed...")
    
    # 1. Create a dummy Tenant
    tenant_id = str(uuid.uuid4())
    tenant_data = {
        "tenant_id": tenant_id,
        "name": "C2C Demo Tenant",
        "slug": f"c2c-demo-{random.randint(1000, 9999)}",
        "status": "active"
    }
    
    print(f"Creating Tenant: {tenant_data['name']}")
    res = supabase.table("tenants").insert(tenant_data).execute()
    
    # 2. Create a dummy User (Owner)
    user_id = str(uuid.uuid4())
    # Note: We won't insert into auth.users directly as it's complex, 
    # we'll just insert into public.users or use this dummy UUID as owner_id
    
    try:
        user_data = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "email": "demo_admin@example.com",
            "name": "Demo Admin",
            "status": "active"
        }
        supabase.table("users").insert(user_data).execute()
        print(f"Created User: {user_data['name']}")
    except Exception as e:
        print(f"Skipping public.users insert (table might not exist yet or have constraints): {e}")
        # Proceed with user_id anyway
    
    # 3. Create Pipelines & Stages
    pipeline_id = str(uuid.uuid4())
    pipeline_data = {
        "pipeline_id": pipeline_id,
        "tenant_id": tenant_id,
        "name": "Default Sales",
        "entity_type": "opportunity"
    }
    supabase.table("pipelines").insert(pipeline_data).execute()
    
    stages = [
        {"name": "New Deal", "sequence": 1},
        {"name": "Contacted", "sequence": 2},
        {"name": "Demo Given", "sequence": 3},
        {"name": "Negotiation", "sequence": 4},
        {"name": "Won", "sequence": 5},
    ]
    stage_ids = []
    for s in stages:
        s_id = str(uuid.uuid4())
        stage_ids.append(s_id)
        stage_data = {
            "stage_id": s_id,
            "tenant_id": tenant_id,
            "pipeline_id": pipeline_id,
            "name": s["name"],
            "sequence": s["sequence"]
        }
        supabase.table("pipeline_stages").insert(stage_data).execute()

    print("Created Pipeline and Stages")

    # 4. Create Accounts
    accounts_to_create = [
        {"name": "University 1", "type": "college", "industry": "Education", "location": "Austin, TX"},
        {"name": "College South 1", "type": "college", "industry": "Education", "location": "Dallas, TX"},
        {"name": "College Village North 2", "type": "college", "industry": "Education", "location": "Chicago, IL"},
        {"name": "Tech Corp Alpha", "type": "company", "industry": "Technology", "location": "San Jose, CA"},
        {"name": "Global Finance Partners", "type": "company", "industry": "Finance", "location": "New York, NY"},
        {"name": "State University Engineering", "type": "college", "industry": "Education", "location": "Columbus, OH"},
        {"name": "HealthTech Solutions", "type": "company", "industry": "Healthcare", "location": "Boston, MA"},
        {"name": "Community College West", "type": "college", "industry": "Education", "location": "Seattle, WA"},
        {"name": "Retail Giants Inc", "type": "company", "industry": "Retail", "location": "Bentonville, AR"},
        {"name": "Design Studio Pro", "type": "company", "industry": "Services", "location": "Los Angeles, CA"},
    ]
    
    account_ids = []
    for acc in accounts_to_create:
        acc_id = str(uuid.uuid4())
        account_ids.append(acc_id)
        supabase.table("accounts").insert({
            "account_id": acc_id,
            "tenant_id": tenant_id,
            "name": acc["name"],
            "type": acc["type"],
            "industry": acc["industry"],
            "city": acc["location"].split(',')[0].strip(),
            "owner_id": user_id
        }).execute()

    print(f"Created {len(accounts_to_create)} Accounts")

    # 5. Create Contacts
    contact_names = ["John Smith", "Emma Davis", "Michael Brown", "Sarah Wilson", "David Taylor", "Lisa Anderson", "James Thomas", "Jennifer Martinez", "Robert Garcia", "Maria Robinson"]
    
    contact_ids = []
    for i, name in enumerate(contact_names):
        first, last = name.split(' ')
        c_id = str(uuid.uuid4())
        contact_ids.append(c_id)
        supabase.table("contacts").insert({
            "contact_id": c_id,
            "tenant_id": tenant_id,
            "account_id": account_ids[i],
            "first_name": first,
            "last_name": last,
            "email": f"{first.lower()}.{last.lower()}@example.com",
            "role": random.choice(["student", "faculty", "placement_officer", "HR"]),
            "owner_id": user_id
        }).execute()
        
    print(f"Created {len(contact_names)} Contacts")

    # 6. Create Opportunities
    opp_types = ["Campus Training", "Corporate Workshop", "Bulk Placement", "SaaS Licensing", "Consulting Project"]
    
    for i in range(15):
        acc_idx = random.randint(0, len(account_ids)-1)
        supabase.table("opportunities").insert({
            "opportunity_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "account_id": account_ids[acc_idx],
            "primary_contact_id": contact_ids[acc_idx],
            "owner_id": user_id,
            "name": f"{accounts_to_create[acc_idx]['name']} - {random.choice(opp_types)}",
            "pipeline_id": pipeline_id,
            "stage_id": random.choice(stage_ids),
            "amount": float(random.randint(5000, 150000)),
            "currency": "USD",
            "probability": random.choice([10, 30, 50, 80, 100]),
            "expected_close_date": (datetime.now() + timedelta(days=random.randint(10, 90))).strftime("%Y-%m-%d"),
            "status": "open"
        }).execute()

    print("Created 15 Opportunities")
    
    # 7. Create Leads
    lead_sources = ["website", "referral", "event", "campaign"]
    for i in range(12):
        supabase.table("leads").insert({
            "lead_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "owner_id": user_id,
            "first_name": f"LeadFirst{i}",
            "last_name": f"LeadLast{i}",
            "email": f"lead{i}@example.org",
            "source": random.choice(lead_sources),
            "status": random.choice(["new", "contacted", "qualified"]),
            "account_name": f"Prospective Company {i}",
            "interest_area": random.choice(["Data Science", "Web Dev", "Soft Skills", "Placements"])
        }).execute()
        
    print("Created 12 Leads")
    print(f"\nSeed Complete! Your active tenant_id is: {tenant_id}")
    
    # Write tenant_id to a temp file for frontend to use
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo_tenant_id.txt"), "w") as f:
        f.write(tenant_id)

if __name__ == "__main__":
    seed_data()
