import os
import sys
from dotenv import load_dotenv
from pathlib import Path

# Add the market-scout directory to path
PROJECT_ROOT = Path(__file__).parent / "services" / "market-scout"
sys.path.append(str(PROJECT_ROOT))

# Load the local .env
load_dotenv(PROJECT_ROOT / ".env")

try:
    from storage.supabase_sync import get_client
    client = get_client()
    
    print("🔍 PROBING SUPABASE TABLES...")
    
    suspected_tables = [
        "market_leads", 
        "psychometric_items", 
        "institutions", 
        "students", 
        "assessments", 
        "assessment_responses"
    ]
    
    found_tables = []
    missing_tables = []
    
    for table in suspected_tables:
        try:
            # Attempt to select 0 rows to check existence
            client.table(table).select("*").limit(0).execute()
            found_tables.append(table)
        except Exception as e:
            if "PGRST204" in str(e) or "404" in str(e):
                missing_tables.append(table)
            else:
                print(f"  [!] Unexpected error checking {table}: {e}")
    
    print("\n✅ FOUND TABLES:")
    for t in found_tables:
        # Check row count for found tables
        res = client.table(t).select("*", count="exact").limit(0).execute()
        print(f"  - {t} ({res.count} rows)")
        
    if missing_tables:
        print("\n❌ MISSING TABLES:")
        for t in missing_tables:
            print(f"  - {t}")
            
except Exception as e:
    print(f"❌ FAILED: {e}")
