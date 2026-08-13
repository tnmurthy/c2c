import os
import sys
from dotenv import load_dotenv
from pathlib import Path

# Add the market-scout directory to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.append(str(PROJECT_ROOT))

# Load the local .env
load_dotenv(PROJECT_ROOT / ".env")

try:
    from storage.supabase_sync import get_client
    
    print("🔌 TESTING SUPABASE CONNECTION...")
    client = get_client()
    
    # Check if we can query the table
    print("📊 Querying 'market_leads' table...")
    resp = client.table("market_leads").select("*", count="exact").limit(1).execute()
    
    print(f"✅ CONNECTION SUCCESSFUL!")
    print(f"📈 Current Row Count in 'market_leads': {resp.count}")
    
except Exception as e:
    print(f"❌ CONNECTION FAILED: {e}")
    print("\n💡 Make sure you have:")
    print("1. Created the 'market_leads' table in Supabase.")
    print("2. Set the correct SUPABASE_URL and SUPABASE_KEY in services/market-scout/.env")
