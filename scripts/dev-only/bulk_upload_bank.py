import os
import sys
import json
from dotenv import load_dotenv
from pathlib import Path

# Add the market-scout directory to path for imports
SCRIPT_DIR = Path(__file__).parent
REAL_PROJECT_ROOT = SCRIPT_DIR.parent.parent
MARKET_SCOUT_DIR = REAL_PROJECT_ROOT / "services" / "market-scout"

sys.path.append(str(MARKET_SCOUT_DIR))

# Load the local .env
load_dotenv(MARKET_SCOUT_DIR / ".env")

BANK_FILE = REAL_PROJECT_ROOT / "api" / "fallback_bank.json"

def bulk_upload():
    if not BANK_FILE.exists():
        print(f"❌ Error: {BANK_FILE} not found.")
        return

    try:
        from storage.supabase_sync import get_client
        client = get_client()
        
        print(f"📂 Loading bank from {BANK_FILE}...")
        with open(BANK_FILE, "r", encoding="utf-8") as f:
            bank = json.load(f)
        
        total = len(bank)
        print(f"🚀 Found {total} items. Starting bulk upload to 'psychometric_items'...")

        # Batching for performance and stability
        batch_size = 50
        for i in range(0, total, batch_size):
            batch = bank[i : i + batch_size]
            
            # Map keys to match the SQL schema
            normalized_batch = []
            for q in batch:
                normalized_batch.append({
                    "id": q.get("ID"),
                    "stem": q.get("stem"),
                    "item_type": q.get("type"),
                    "primary_dimension": q.get("primary_dimension"),
                    "secondary_dimensions": q.get("secondary_dimensions"),
                    "tags": q.get("tags"),
                    "options": q.get("options"),
                    "scoring_logic": {"raw": q.get("scoring_logic")} if isinstance(q.get("scoring_logic"), str) else q.get("scoring_logic")
                })
            
            try:
                # Upsert current batch
                client.table("psychometric_items").upsert(normalized_batch).execute()
                print(f"  [+] Uploaded items {i+1} to {min(i+batch_size, total)}")
            except Exception as e:
                print(f"  [!] Error in batch starting at {i+1}: {e}")
        
        print("\n🏆 FULL BANK UPLOAD COMPLETE!")
        
    except Exception as e:
        print(f"❌ FAILED: {e}")

if __name__ == "__main__":
    bulk_upload()
