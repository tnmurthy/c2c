# scripts/generate_bank_llm.py
import os, json, time
from pathlib import Path
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
MODEL = "claude-haiku-4-5-20251001"

DIMENSIONS = {
    "EQ": 150, "SQ": 120, "AQ": 100, "IQ": 80, "SpQ": 50,
}
BATCH_SIZE = 20  # items per API call — tune up if truncation isn't a problem

SYSTEM = """You write items for a workplace-readiness psychometric assessment for early-career
tech candidates (India, Tier 2/3 colleges). Output ONLY a JSON array, no prose, no markdown fences.

Each item object:
{"stem": str, "type": "Likert"|"SJT"|"Cognitive", "secondary_dimensions": [str,str],
 "tags": [str], "options": null | {"A":str,"B":str,"C":str,"D":str},
 "scoring_logic": str}

Rules:
- Likert: options=null, scoring_logic states direction (normal/reverse) and that 1-5 maps to points.
- SJT: 4 options, scoring_logic gives points per option (best answer highest).
- Cognitive (IQ only): options are 4 answers, scoring_logic states the correct letter and why.
- Every stem must be a genuinely distinct scenario/wording — no template reuse, no placeholder text.
- Ground scenarios in real early-career contexts: internships, remote work, ghosting, group
  projects, layoffs/AI displacement, feedback, networking, financial pressure, mentorship."""

def generate_batch(dimension: str, count: int, existing_stems: list[str]) -> list[dict]:
    avoid = "\n".join(f"- {s}" for s in existing_stems[-15:])  # small sample, not full history — keeps input tokens low
    prompt = f"""Generate {count} {dimension} items.
Avoid repeating the style/wording of these already-used stems:
{avoid if avoid else "(none yet)"}"""

    resp = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    text = resp.content[0].text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # cheap repair: model sometimes wraps in ```json — strip and retry once
        text = text.strip("`").removeprefix("json").strip()
        return json.loads(text)

def generate_dimension(dim: str, target: int) -> list[dict]:
    items, seen_stems = [], []
    while len(items) < target:
        n = min(BATCH_SIZE, target - len(items))
        batch = generate_batch(dim, n, seen_stems)
        for i, item in enumerate(batch):
            item["ID"] = f"{dim}-{len(items)+1:03d}"
            item["primary_dimension"] = dim
            items.append(item)
            seen_stems.append(item["stem"])
        time.sleep(0.5)  # light rate-limit courtesy
    return items[:target]

def main():
    bank = []
    for dim, count in DIMENSIONS.items():
        print(f"Generating {count} {dim} items...")
        bank.extend(generate_dimension(dim, count))

    out = Path(__file__).parent / "FULL_PSYCHOMETRIC_BANK_LLM.json"
    out.write_text(json.dumps(bank, indent=2))
    print(f"✅ {len(bank)} items written to {out}")

if __name__ == "__main__":
    main()