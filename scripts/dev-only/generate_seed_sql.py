import uuid
import random
from datetime import datetime, timedelta

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    # Escape quotes
    return "'" + str(val).replace("'", "''") + "'"

def generate_sql():
    sql = []
    sql.append("-- Auto-generated CRM seed data\n")
    
    tenant_id = str(uuid.uuid4())
    sql.append(f"INSERT INTO tenants (tenant_id, name, slug, status) VALUES ({escape_sql(tenant_id)}, {escape_sql('C2C Demo Tenant')}, {escape_sql(f'c2c-demo-{random.randint(1000, 9999)}')}, {escape_sql('active')});")
    
    user_id = str(uuid.uuid4())
    sql.append(f"INSERT INTO crm_users (user_id, tenant_id, email, name, status) VALUES ({escape_sql(user_id)}, {escape_sql(tenant_id)}, {escape_sql('demo_admin@example.com')}, {escape_sql('Demo Admin')}, {escape_sql('active')});")
    
    pipeline_id = str(uuid.uuid4())
    sql.append(f"INSERT INTO pipelines (pipeline_id, tenant_id, name, entity_type, is_default) VALUES ({escape_sql(pipeline_id)}, {escape_sql(tenant_id)}, {escape_sql('Default Sales')}, {escape_sql('opportunity')}, TRUE);")
    
    stages = [("New Deal", 1), ("Contacted", 2), ("Demo Given", 3), ("Negotiation", 4), ("Won", 5)]
    stage_ids = []
    for name, seq in stages:
        s_id = str(uuid.uuid4())
        stage_ids.append(s_id)
        sql.append(f"INSERT INTO pipeline_stages (stage_id, tenant_id, pipeline_id, name, sequence) VALUES ({escape_sql(s_id)}, {escape_sql(tenant_id)}, {escape_sql(pipeline_id)}, {escape_sql(name)}, {seq});")
        
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
        sql.append(f"INSERT INTO accounts (account_id, tenant_id, name, type, industry, city, owner_id) VALUES ({escape_sql(acc_id)}, {escape_sql(tenant_id)}, {escape_sql(acc['name'])}, {escape_sql(acc['type'])}, {escape_sql(acc['industry'])}, {escape_sql(acc['location'])}, {escape_sql(user_id)});")

    contact_names = ["John Smith", "Emma Davis", "Michael Brown", "Sarah Wilson", "David Taylor", "Lisa Anderson", "James Thomas", "Jennifer Martinez", "Robert Garcia", "Maria Robinson"]
    contact_ids = []
    for i, name in enumerate(contact_names):
        first, last = name.split(' ')
        c_id = str(uuid.uuid4())
        contact_ids.append(c_id)
        role = random.choice(["student", "faculty", "placement_officer", "HR"])
        email = f"{first.lower()}.{last.lower()}@example.com"
        sql.append(f"INSERT INTO contacts (contact_id, tenant_id, account_id, first_name, last_name, email, role, owner_id) VALUES ({escape_sql(c_id)}, {escape_sql(tenant_id)}, {escape_sql(account_ids[i])}, {escape_sql(first)}, {escape_sql(last)}, {escape_sql(email)}, {escape_sql(role)}, {escape_sql(user_id)});")

    opp_types = ["Campus Training", "Corporate Workshop", "Bulk Placement", "SaaS Licensing", "Consulting Project"]
    for i in range(15):
        acc_idx = random.randint(0, len(account_ids)-1)
        name = f"{accounts_to_create[acc_idx]['name']} - {random.choice(opp_types)}"
        amount = float(random.randint(5000, 150000))
        prob = random.choice([10, 30, 50, 80, 100])
        close_date = (datetime.now() + timedelta(days=random.randint(10, 90))).strftime("%Y-%m-%d")
        sql.append(f"INSERT INTO opportunities (opportunity_id, tenant_id, account_id, primary_contact_id, owner_id, name, pipeline_id, stage_id, amount, currency, probability, expected_close_date, status) VALUES ({escape_sql(str(uuid.uuid4()))}, {escape_sql(tenant_id)}, {escape_sql(account_ids[acc_idx])}, {escape_sql(contact_ids[acc_idx])}, {escape_sql(user_id)}, {escape_sql(name)}, {escape_sql(pipeline_id)}, {escape_sql(random.choice(stage_ids))}, {amount}, 'USD', {prob}, {escape_sql(close_date)}, 'open');")

    lead_sources = ["website", "referral", "event", "campaign"]
    for i in range(12):
        email = f"lead{i}@example.org"
        source = random.choice(lead_sources)
        status = random.choice(["new", "contacted", "qualified"])
        interest = random.choice(["Data Science", "Web Dev", "Soft Skills", "Placements"])
        sql.append(f"INSERT INTO leads (lead_id, tenant_id, owner_id, first_name, last_name, email, source, status, account_name, interest_area) VALUES ({escape_sql(str(uuid.uuid4()))}, {escape_sql(tenant_id)}, {escape_sql(user_id)}, {escape_sql(f'LeadFirst{i}')}, {escape_sql(f'LeadLast{i}')}, {escape_sql(email)}, {escape_sql(source)}, {escape_sql(status)}, {escape_sql(f'Prospective Company {i}')}, {escape_sql(interest)});")

    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = r'C:\Users\Sriad\.gemini\antigravity-cli\brain\ed6a6b62-f9f4-489b-aedd-720bfb924041\scratch\generated_seed.sql'
    with open(output_path, 'w') as f:
        f.write('\n'.join(sql))
    
    tenant_output = r'C:\Users\Sriad\.gemini\antigravity-cli\brain\ed6a6b62-f9f4-489b-aedd-720bfb924041\scratch\demo_tenant_id.txt'
    with open(tenant_output, 'w') as f:
        f.write(tenant_id)

if __name__ == '__main__':
    generate_sql()
