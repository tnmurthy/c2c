import asyncio
import os
import sys
import json
from datetime import datetime, timezone

# Get the directory of the current script (scripts)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Get the project root directory
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# Add project root and backend to path
sys.path.append(PROJECT_ROOT)
sys.path.append(os.path.join(PROJECT_ROOT, "services", "job-intel-desk", "backend"))

# Mocking the scout services since we don't have all dependencies (like kuzu) in this environment
class MockScout:
    @staticmethod
    def run(urls=None, targets=None):
        return [
            {
                "title": "Senior AI Research Engineer",
                "company": "OpenAI",
                "url": "https://openai.com/careers/senior-ai-research-engineer",
                "platform": "ats",
                "description": "Develop and optimize large-scale language models (LLMs) and research new architectures.",
                "posted_date": "2026-06-10"
            },
            {
                "title": "LLM Infrastructure Engineer",
                "company": "Anthropic",
                "url": "https://anthropic.com/careers/llm-infra",
                "platform": "ats",
                "description": "Build high-performance distributed systems for training and serving massive AI models.",
                "posted_date": "2026-06-12"
            },
            {
                "title": "Machine Learning Intern",
                "company": "Perplexity AI",
                "url": "https://perplexity.ai/careers/intern",
                "platform": "ats",
                "description": "Join the core team to help build the world's best search engine using LLMs.",
                "posted_date": "2026-06-14"
            },
            {
                "title": "React Frontend Developer",
                "company": "E-Commerce Corp",
                "url": "https://example.com/jobs/react",
                "platform": "jobicy",
                "description": "Build modern UIs with React and Tailwind CSS. Not AI related.",
                "posted_date": "2026-06-13"
            }
        ]

scout = MockScout()
free_scout = MockScout()

async def run_market_intelligence(queries):
    print(f"🕵️ RUNNING MARKET INTELLIGENCE (Unit 4)...")
    print(f"Searching for roles: {', '.join(queries)}")
    
    all_leads = []
    
    # 1. RSS/API Scouting (High Signal)
    print("\n📡 Phase 1: Scraping RSS and APIs (RemoteOK, HN, Jobicy)...")
    targets = [
        "https://remoteok.com/api",
        "https://news.ycombinator.com/item?id=38870106", # Example HN thread id
        "https://jobicy.com/api/v2/remote-jobs",
        "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss"
    ]
    
    # Run the standard scout
    leads = scout.run(urls=targets)
    all_leads.extend(leads)
    print(f"✅ Found {len(leads)} leads from standard sources.")

    # 2. ATS/Direct Scouting (Niche AI Boards)
    print("\n🏢 Phase 2: Scraping Direct ATS (OpenAI, Anthropic, Perplexity)...")
    ats_targets = [
        "ats:greenhouse:openai",
        "ats:greenhouse:anthropic",
        "ats:lever:perplexity"
    ]
    
    free_leads = free_scout.run(targets=ats_targets)
    all_leads.extend(free_leads)
    print(f"✅ Found {len(free_leads)} leads from ATS sources.")

    # 3. Filtering for AI Alignment
    print("\n🎯 Phase 3: Filtering for AI/LLM Alignment...")
    ai_leads = []
    for lead in all_leads:
        text = (lead.get("title", "") + " " + lead.get("description", "")).lower()
        if any(term in text for term in ["ai", "llm", "rag", "agent", "language model", "machine learning", "pytorch"]):
            ai_leads.append(lead)
    
    print(f"✅ Filtered down to {len(ai_leads)} high-signal AI roles.")
    
    # 4. Save to Market Intelligence Feed
    feed_file = os.path.join(PROJECT_ROOT, "MARKET_INTELLIGENCE_FEED.json")
    with open(feed_file, "w", encoding="utf-8") as f:
        json.dump(ai_leads, f, indent=2)
    
    print(f"\n📊 MARKET REPORT:")
    print(f"- Total Leads Scanned: {len(all_leads)}")
    print(f"- AI-Aligned Roles: {len(ai_leads)}")
    print(f"- Feed saved to: {feed_file}")
    
    return ai_leads

if __name__ == "__main__":
    queries = ["AI Research Engineer", "LLM Specialist"]
    asyncio.run(run_market_intelligence(queries))
