import os
import sys
import json
from dotenv import load_dotenv
from pathlib import Path

# Add the market-scout directory to path
PROJECT_ROOT = Path(__file__).parent.parent.parent / "services" / "market-scout"
sys.path.append(str(PROJECT_ROOT))

# Load the local .env
load_dotenv(PROJECT_ROOT / ".env")

try:
    from storage.supabase_sync import get_client
    client = get_client()
    
    print("📋 FETCHING SUPABASE SCHEMA...")
    
    # Query information_schema to see the actual table structures
    # We'll check both tables we've worked with: market_leads and psychometric_items
    
    tables = ["market_leads", "psychometric_items"]
    
    for table in tables:
        print(f"\n--- Schema for: {table} ---")
        # Direct SQL via rpc if allowed, or we can use a trick with a limit 0 select
        # But for true schema, information_schema is better. 
        # Note: Supabase JS/Python clients don't always expose raw SQL, 
        # but we can try fetching one row and looking at keys as a fallback if SQL fails.
        
        try:
            # We'll try to fetch columns from the PostgREST metadata if possible, 
            # or just get the first row.
            res = client.table(table).select("*").limit(1).execute()
            if res.data:
                columns = res.data[0].keys()
                print(f"Columns found: {', '.join(columns)}")
                # Show types by inspecting the first row
                for col in columns:
                    val = res.data[0][col]
                    print(f"  - {col}: {type(val).__name__} (Sample: {val})")
            else:
                print("Table is empty, cannot infer column types via data inspection.")
                
        except Exception as e:
            print(f"Error inspecting {table}: {e}")

    # Also try to check for other tables in the schema
    print("\n🔍 Checking for other tables in 'public' schema...")
    try:
        # Note: This might require higher permissions than anon key depending on Supabase settings
        # We can try a known system table query
        pass
    except:
        pass

except Exception as e:
    print(f"❌ FAILED: {e}")
