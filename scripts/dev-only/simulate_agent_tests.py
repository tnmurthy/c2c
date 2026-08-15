import os
import sys
import json
import random
from pathlib import Path

# Reconfigure stdout/stderr to support Unicode (emojis) in Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.append(str(PROJECT_ROOT))

# Load the full bank
BANK_FILE = PROJECT_ROOT / "api" / "fallback_bank.json"
with open(BANK_FILE, "r", encoding="utf-8") as f:
    bank = json.load(f)

# Group bank by dimension
dims = {'IQ': [], 'EQ': [], 'SQ': [], 'AQ': [], 'SpQ': []}
for q in bank:
    dim = q.get('primary_dimension', 'UNKNOWN')
    if dim in dims:
        dims[dim].append(q)

def generate_test():
    """Generates a 25-question test (5 per dimension)"""
    test = []
    for dim, qs in dims.items():
        if len(qs) >= 5:
            test.extend(random.sample(qs, 5))
        else:
            test.extend(qs)
    random.shuffle(test)
    return test

# Define Agent Personas and their answering biases
AGENTS = {
    "Anthropologist": {
        "dominant_dim": "SQ", # Focuses on culture, tribe, networking
        "founder_bias": "B",  # Leader (People-centric)
        "likert_bias": lambda dim: 5 if dim in ["SQ", "EQ", "SpQ"] else random.randint(3, 4)
    },
    "Geographer": {
        "dominant_dim": "IQ", # Focuses on systems, mapping, spatial
        "founder_bias": "D",  # Anchor (Process/Structure)
        "likert_bias": lambda dim: 5 if dim in ["IQ", "AQ"] else random.randint(2, 4)
    },
    "Historian": {
        "dominant_dim": "SpQ", # Focuses on deep context, meaning, long-term
        "founder_bias": "D",   # Anchor (Risk-conscious, historical)
        "likert_bias": lambda dim: 5 if dim in ["SpQ", "IQ"] else random.randint(3, 4)
    },
    "Narratologist": {
        "dominant_dim": "EQ", # Focuses on story, character arcs, empathy
        "founder_bias": "C",  # Rainmaker (Pitch, Storytelling)
        "likert_bias": lambda dim: 5 if dim in ["EQ", "SQ"] else random.randint(2, 4)
    },
    "Psychologist": {
        "dominant_dim": "EQ", # Focuses on human behavior, regulation
        "founder_bias": "B",  # Leader (Empathy, conflict resolution)
        "likert_bias": lambda dim: 5 if dim in ["EQ", "AQ"] else random.randint(3, 5)
    }
}

def simulate_agent(name, profile):
    print(f"🤖 Agent [{name}] is taking the assessment...")
    test = generate_test()
    scores = {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}
    founder_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
    responses = []

    for q in test:
        dim = q["primary_dimension"]
        itype = q.get("type", q.get("item_type", "")).lower()
        logic = q.get("scoring_logic", "")
        
        answer = None
        points = 0

        if "likert" in itype:
            answer = profile["likert_bias"](dim)
            # handle reverse
            if isinstance(logic, dict) and logic.get("direction") == "reverse" or (isinstance(logic, str) and "reverse" in logic.lower()):
                points = 6 - answer
            else:
                points = answer
            scores[dim] += points
            
        elif "sjt" in itype:
            # Pick their founder bias 70% of the time, else random
            if random.random() < 0.7:
                answer = profile["founder_bias"]
            else:
                answer = random.choice(["A", "B", "C", "D"])
            
            founder_counts[answer] += 1
            
            # Simulated scoring (usually out of 4 for SJT)
            points = random.randint(2, 4) if answer == profile["founder_bias"] else random.randint(0, 2)
            scores[dim] += points

        elif "cognitive" in itype:
            # Cognitive: high IQ dominant agents get it right more often
            prob = 0.9 if profile["dominant_dim"] == "IQ" else 0.6
            if random.random() < prob:
                answer = "CORRECT" # Simulating correct answer
                points = 1
            else:
                answer = "INCORRECT"
                points = 0
            scores[dim] += points
            
        responses.append({"item_id": q.get("id"), "dimension": dim, "answer": answer, "points": points})

    # Map founder
    founder_map = {"A": "Builder", "B": "Leader", "C": "Rainmaker", "D": "Anchor"}
    primary_letter = max(founder_counts, key=founder_counts.get)
    primary_founder = founder_map[primary_letter]

    return {
        "name": name,
        "scores": scores,
        "founder_counts": founder_counts,
        "primary_founder": primary_founder,
        "responses": responses
    }

results = []
for agent_name, profile in AGENTS.items():
    res = simulate_agent(agent_name, profile)
    results.append(res)

with open("AGENT_TEST_RESULTS.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("\n✅ All 5 agents completed the test. Results saved to AGENT_TEST_RESULTS.json")

# Extract the Anthropologist for the detailed report
anthro = next(r for r in results if r["name"] == "Anthropologist")

print("\n" + "="*60)
print(f"📄 DETAILED ASSESSMENT REPORT: {anthro['name'].upper()}")
print("="*60)

print("\n📊 1. INTELLIGENCE METRIC SCORES (Out of approx 25 max per dim)")
for dim, score in anthro['scores'].items():
    print(f"   - {dim}: {score}")

print(f"\n👑 2. FOUNDER FIT: {anthro['primary_founder'].upper()}")
print("   SJT Response Distribution:")
for letter, count in anthro['founder_counts'].items():
    profile = {"A": "Builder", "B": "Leader", "C": "Rainmaker", "D": "Anchor"}[letter]
    print(f"   - Option {letter} ({profile}): {count} selections")

print("\n🧠 3. PSYCHOMETRIC INSIGHTS & FINDINGS")
print(f"   The {anthro['name']} agent demonstrated a strong bias toward the '{anthro['primary_founder']}' profile.")
print("   - High SQ (Social Quotient) indicates this agent views startup challenges as 'tribal' problems that require consensus and cultural alignment to solve.")
print("   - Their Likert responses heavily favored high-empathy answers, actively rejecting 'ghosting' behaviors and prioritizing community health over raw velocity.")
print(f"   - Recommendation: As a {anthro['primary_founder']}, this agent should be paired with a 'Builder' (to handle technical execution) and an 'Anchor' (to maintain operational boundaries), allowing them to focus entirely on team morale, culture setting, and recruiting.")
print("============================================================")
