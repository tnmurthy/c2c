import json
import yaml
from pathlib import Path
from ai.client import generate

def analyse_batch(items: list[dict], context: str = "") -> list[dict]:
    """Analyse items in batches. Returns items enriched with AI fields."""
    config = yaml.safe_load((Path(__file__).parent.parent / "config.yaml").read_text())
    model = config.get("ai", {}).get("model") or ""  # "" -> client DEFAULT_MODEL
    rate_limit = config.get("ai", {}).get("rate_limit_seconds", 7.0)
    min_score = config.get("ai", {}).get("min_score", 0)
    batch_size = config.get("ai", {}).get("batch_size", 5)

    batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
    print(f"  [AI] {len(items)} items → {len(batches)} API calls")

    enriched = []
    for i, batch in enumerate(batches):
        print(f"  [AI] Batch {i + 1}/{len(batches)}...")
        prompt = _build_prompt(batch, context, config)
        result = generate(prompt, model=model, rate_limit=rate_limit)

        analyses = result.get("analyses", [])
        for j, item in enumerate(batch):
            ai = analyses[j] if j < len(analyses) else {}
            if ai:
                score = max(0, min(100, int(ai.get("score", 0))))
                if min_score and score < min_score:
                    continue
                enriched.append({
                    **item, 
                    "ai_score": score, 
                    "ai_summary": ai.get("summary", ""), 
                    "ai_notes": ai.get("notes", "")
                })
            else:
                # No AI verdict (call failed, refused by the daily cap, or key rejected):
                # store the item unscored. min_score only filters items that WERE scored -
                # otherwise an AI outage silently drops every scraped job.
                enriched.append({**item, "ai_score": None})

    return enriched

def _build_prompt(batch, context, config):
    priorities = config.get("priorities", [])
    items_text = "\n\n".join(
        f"Item {i+1}: {json.dumps({k: v for k, v in item.items() if k in ['name', 'company', 'description']})}"
        for i, item in enumerate(batch)
    )

    return f"""Analyse these {len(batch)} job items and return a JSON object.

# Job Items
{items_text}

# Target Candidate Personas
{context}

# Scoring Priorities
{chr(10).join(f"- {p}" for p in priorities)}

# Instructions
Return: {{"analyses": [{{"score": <0-100>, "summary": "<1-2 sentences>", "notes": "<why this matches>"}} for each item in order]}}
Score 90+=Perfect fit for a c2c persona, 70-89=Strong match, 50-69=Possible, <50=Irrelevant."""
