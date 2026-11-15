import os
import sys
import yaml
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.append(str(PROJECT_ROOT))

from scraper.sources import hn_hiring, remoteok
from storage.supabase_sync import sync

SOURCES = [
    ("Hacker News", hn_hiring.fetch),
    ("RemoteOK", remoteok.fetch),
]

def ai_enabled():
    return bool(os.environ.get("GEMINI_API_KEY"))

def main():
    print("👔 STARTING C2C MARKET SCOUT...")
    
    # Load Config
    config_path = PROJECT_ROOT / "config.yaml"
    if not config_path.exists():
        print(f"ERROR: Config not found at {config_path}")
        return
    config = yaml.safe_load(config_path.read_text())
    
    # 1. Scrape all sources
    all_items = []
    for name, fetch_fn in SOURCES:
        try:
            items = fetch_fn()
            print(f"  [{name}] Found {len(items)} potential items.")
            all_items.extend(items)
        except Exception as e:
            print(f"  [{name}] FAILED: {e}")

    # 2. Deduplicate by URL
    seen, deduped = set(), []
    for item in all_items:
        if (url := item.get("url", "")) and url not in seen:
            seen.add(url)
            deduped.append(item)

    print(f"🔍 Unique potential items: {len(deduped)}")

    if not deduped:
        print("Done - No new items found.")
        return

    # 3. AI Enrichment (Scoring & Summarization)
    if ai_enabled():
        from ai.pipeline import analyse_batch
        
        context_path = PROJECT_ROOT / "profile" / "context.md"
        context = context_path.read_text() if context_path.exists() else ""
        
        print(f"🧠 Enriching {len(deduped)} items with Gemini AI...")
        enriched = analyse_batch(deduped, context=context)
    else:
        print("⚠️ AI Enrichment skipped (GEMINI_API_KEY not set).")
        enriched = deduped

    # 4. Store in Supabase
    table = config.get("storage", {}).get("table", "market_leads")
    print(f"💾 Syncing {len(enriched)} items to Supabase table: {table}...")
    
    try:
        added, skipped = sync(table, enriched)
        print(f"✅ DONE - Added: {added}, Existing/Filtered: {skipped}")
    except Exception as e:
        print(f"❌ Storage Sync Failed: {e}")

    # 5. Matching Phase
    try:
        print("🤝 Starting Matching Phase...")
        from storage.supabase_sync import get_client
        client = get_client()
        
        # Recommendation mapping
        RECOMMENDATION_MAPPING = {
            "Builder": ["Engineer", "Developer", "Researcher", "Architect"],
            "Leader": ["Manager", "Lead", "Culture", "Director"],
            "Rainmaker": ["Sales", "Partnership", "Advocate", "Growth"],
            "Anchor": ["Operations", "QA", "SRE", "DevOps", "Analyst", "Data"]
        }
        
        # Get all students
        students_res = client.table("students").select("id").eq("is_synthetic", False).execute()  # ADR-002: no seeded students
        if students_res.data:
            student_ids = [s["id"] for s in students_res.data]
            assessments_res = client.table("assessments").select("*").in_("student_id", student_ids).execute()
            
            latest_assessments = {}
            for a in assessments_res.data or []:
                student_id = a["student_id"]
                if student_id not in latest_assessments or a.get("created_at", "") > latest_assessments[student_id].get("created_at", ""):
                    latest_assessments[student_id] = a
                    
            new_alerts = []
            for item in enriched:
                title = item.get("name", "")
                url = item.get("url")
                if not title or not url: continue
                
                for s_id, assessment in latest_assessments.items():
                    profile = assessment.get("primary_profile")
                    if profile in RECOMMENDATION_MAPPING:
                        keywords = RECOMMENDATION_MAPPING[profile]
                        if any(kw.lower() in title.lower() for kw in keywords):
                            new_alerts.append({
                                "student_id": s_id,
                                "lead_url": url,
                                "score": item.get("ai_score", 0)
                            })
            
            if new_alerts:
                print(f"🔔 Creating {len(new_alerts)} match alerts...")
                client.table("match_alerts").insert(new_alerts).execute()
            else:
                print("No new matches found.")
    except Exception as e:
        print(f"❌ Matching Phase Failed: {e}")

if __name__ == "__main__":
    main()
