import os
import sys
import json
from dotenv import load_dotenv
from pathlib import Path

# Add the market-scout directory to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.append(str(PROJECT_ROOT))

# Load the local .env
load_dotenv(PROJECT_ROOT / ".env")

QUESTIONS = [
  {
    "id": "EQ_L_003",
    "stem": "I can accurately guess an interviewer’s mood even when the interview is conducted over a voice-only call.",
    "item_type": "likert",
    "primary_dimension": "EQ",
    "tags": ["remote-interviews", "social-cues"],
    "scoring_logic": { "direction": "positive" },
    "intended_audience": "early_jobseeker"
  },
  {
    "id": "EQ_L_004",
    "stem": "When I receive a 'Request for Revision' on a project I worked hard on, my first feeling is a sense of personal failure.",
    "item_type": "likert",
    "primary_dimension": "EQ",
    "tags": ["feedback", "regulation"],
    "scoring_logic": { "direction": "reverse" },
    "intended_audience": "college_student"
  },
  {
    "id": "SQ_S_002",
    "stem": "You are in a project Discord and a teammate is consistently 'ghosting' their tasks. How do you handle it?",
    "item_type": "sjt_single",
    "primary_dimension": "SQ",
    "tags": ["collaboration", "remote-work"],
    "options": [
      { "label": "A", "text": "Call them out in the general channel to create accountability.", "value": "low_sq" },
      { "label": "B", "text": "DM them privately to ask if they need help or are facing a blocker.", "value": "high_sq" },
      { "label": "C", "text": "Report them to the professor/lead immediately without warning.", "value": "low_sq" },
      { "label": "D", "text": "Do their work yourself to ensure the project doesn't fail.", "value": "low_sq_low_aq" }
    ],
    "scoring_logic": { "correct_answer": "B" }
  },
  {
    "id": "AQ_S_001",
    "stem": "The AI tool you were using to build your portfolio suddenly goes behind a paywall you can't afford. What's the move?",
    "item_type": "sjt_single",
    "primary_dimension": "AQ",
    "tags": ["resourcefulness", "tech-shift"],
    "options": [
      { "label": "A", "text": "Pause the project until you can save up enough money.", "value": "low_aq" },
      { "label": "B", "text": "Search GitHub for an open-source alternative and learn how to use it.", "value": "high_aq" },
      { "label": "C", "text": "Complain about the company on social media to get their attention.", "value": "low_aq" },
      { "label": "D", "text": "Re-evaluate if you actually need that tool and simplify your design.", "value": "mid_aq" }
    ],
    "scoring_logic": { "correct_answer": "B" }
  },
  {
    "id": "IQ_C_004",
    "stem": "Git is to Version Control as Docker is to ______.",
    "item_type": "cognitive",
    "primary_dimension": "IQ",
    "tags": ["technical-reasoning", "analogies"],
    "options": [
      { "label": "A", "text": "Shipping", "value": 0 },
      { "label": "B", "text": "Containerization", "value": 1 },
      { "label": "C", "text": "Virtualization", "value": 0 },
      { "label": "D", "text": "Cloud", "value": 0 }
    ],
    "scoring_logic": { "correct_answer": "B" }
  },
  {
    "id": "SpQ_L_002",
    "stem": "I would rather work for a company with a 'B-Corp' certification than one with a high-growth 'Unicorn' status if their ethics were unclear.",
    "item_type": "likert",
    "primary_dimension": "SpQ",
    "tags": ["values-alignment", "career-choice"],
    "scoring_logic": { "direction": "positive" }
  },
  {
    "id": "AQ_L_002",
    "stem": "I find that I do my best work when the original plan falls apart and I have to improvise.",
    "item_type": "likert",
    "primary_dimension": "AQ",
    "tags": ["resilience", "improv"],
    "scoring_logic": { "direction": "positive" }
  },
  {
    "id": "SQ_L_003",
    "stem": "When I join a new community (e.g., a new Slack or subreddit), I tend to watch for a long time before I ever post.",
    "item_type": "likert",
    "primary_dimension": "SQ",
    "tags": ["proactivity", "community"],
    "scoring_logic": { "direction": "reverse" }
  },
  {
    "id": "EQ_S_001",
    "stem": "A peer gives you very harsh public feedback on your code during a hackathon. Your reaction is to:",
    "item_type": "sjt_single",
    "primary_dimension": "EQ",
    "tags": ["regulation", "peer-feedback"],
    "options": [
      { "label": "A", "text": "Point out a flaw in their work to level the playing field.", "value": "low_eq" },
      { "label": "B", "text": "Thank them for the perspective and ask for a specific suggestion to fix it.", "value": "high_eq" },
      { "label": "C", "text": "Quietly leave the group to avoid further confrontation.", "value": "mid_eq_low_aq" },
      { "label": "D", "text": "Explain why you made those choices and dismiss their feedback as 'opinion'.", "value": "low_eq" }
    ],
    "scoring_logic": { "correct_answer": "B" }
  },
  {
    "id": "IQ_C_005",
    "stem": "If 'SPRINT' is coded as 'TQSJOU', what is 'CODE' coded as?",
    "item_type": "cognitive",
    "primary_dimension": "IQ",
    "tags": ["pattern-recognition", "logic"],
    "options": [
      { "label": "A", "text": "DPEF", "value": 1 },
      { "label": "B", "text": "BNDC", "value": 0 },
      { "label": "C", "text": "DOEF", "value": 0 },
      { "label": "D", "text": "DPFE", "value": 0 }
    ],
    "scoring_logic": { "correct_answer": "A" }
  }
]

try:
    from storage.supabase_sync import get_client
    
    print("🚀 UPDATING PSYCHOMETRIC BANK...")
    client = get_client()
    
    # 1. Create table if not exists (using rpc or raw query if possible, but let's assume it exists or fail gracefully)
    # Since we don't have a direct 'query' tool here, we'll try to insert.
    
    # 2. Insert items
    for q in QUESTIONS:
        try:
            # Normalizing fields for SQL
            record = {
                "id": q["id"],
                "stem": q["stem"],
                "item_type": q["item_type"],
                "primary_dimension": q["primary_dimension"],
                "secondary_dimensions": q.get("secondary_dimensions", []),
                "tags": q.get("tags", []),
                "intended_audience": q.get("intended_audience", "college_student"),
                "options": q.get("options"),
                "scoring_logic": q.get("scoring_logic")
            }
            client.table("psychometric_items").upsert(record).execute()
            print(f"  [+] Updated {q['id']}")
        except Exception as e:
            if "PGRST204" in str(e) or "404" in str(e):
                print(f"❌ Table 'psychometric_items' does not exist. Please run the schema SQL first.")
                sys.exit(1)
            else:
                print(f"  [!] Error updating {q['id']}: {e}")
    
    print("\n✅ Psychometric bank update complete!")
    
except Exception as e:
    print(f"❌ FAILED: {e}")
