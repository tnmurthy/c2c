import os
import sys
import json
import io
import time
import argparse
from typing import List, Dict, Any

# Enforce UTF-8 system encoding for Windows terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from api.item_generator import generate_llm_item, generate_llm_items_batch

def main():
    parser = argparse.ArgumentParser(description="Bulk LLM Psychometric Bank Generator")
    parser.add_argument("--test", action="store_true", help="Generate a small sample bank (5 items total) for fast testing")
    default_out = os.path.join(PROJECT_ROOT, "FULL_PSYCHOMETRIC_BANK_LLM.json")
    parser.add_argument("--out", type=str, default=default_out, help="Output file path")
    args = parser.parse_args()

    # Contexts list for variety
    contexts = [
        "internship hunt", "remote work", "ghosting", "AI displacement", 
        "group projects", "startup pivots", "social media branding", "financial stress",
        "work-life balance", "feedback loops", "networking", "digital nomadism",
        "diversity & inclusion", "mental health", "career transitions", "hustle culture"
    ]

    if args.test:
        target_counts = {
            "EQ": 1,
            "SQ": 1,
            "AQ": 1,
            "IQ": 1,
            "SpQ": 1
        }
    else:
        target_counts = {
            "EQ": 150,
            "SQ": 120,
            "AQ": 100,
            "IQ": 80,
            "SpQ": 50
        }

    bank = []
    types_map = {
        "EQ": ["SJT", "Likert"],
        "SQ": ["SJT", "Likert"],
        "AQ": ["SJT", "Likert"],
        "IQ": ["Cognitive"],
        "SpQ": ["Likert"]
    }

    print(f"🚀 Starting Psychometric Item Generation (Target count: {sum(target_counts.values())} items)")
    print(f"📁 Output file: {args.out}")

    total_idx = 1
    for dim, count in target_counts.items():
        print(f"\n🧠 Generating {count} items for dimension: {dim}")
        allowed_types = types_map[dim]
        
        # Calculate items needed per type
        items_per_type = count // len(allowed_types)
        
        for type_idx, item_type in enumerate(allowed_types):
            type_count = items_per_type
            if type_idx == len(allowed_types) - 1:
                # Add remainder to last type to ensure exact count matching
                type_count += count % len(allowed_types)
                
            batch_size = 10
            if args.test:
                batch_size = 1
                
            generated_for_type = 0
            while generated_for_type < type_count:
                current_batch_size = min(batch_size, type_count - generated_for_type)
                ctx = contexts[len(bank) % len(contexts)]
                
                # Fetch recent stems to avoid duplication
                recent_stems = [item["stem"] for item in bank[-30:]]
                
                print(f"[{total_idx}/{sum(target_counts.values())}] Batch generating {current_batch_size}x {dim} ({item_type}) in context: '{ctx}'...", end="", flush=True)
                
                start_time = time.time()
                batch_items = generate_llm_items_batch(dim, item_type, ctx, current_batch_size, recent_stems=recent_stems)
                elapsed = time.time() - start_time
                
                # Format IDs and append
                for item in batch_items:
                    global_i = len([b for b in bank if b["primary_dimension"] == dim]) + 1
                    item["id"] = f"{dim}-{global_i:03d}"
                    bank.append(item)
                    
                print(f" Done ({elapsed:.1f}s) -> Generated IDs up to: {dim}-{len([b for b in bank if b['primary_dimension'] == dim]):03d}")
                
                # Simple cooling sleep to avoid hitting hard rate limit thresholds if using LLM
                if os.environ.get("GEMINI_API_KEY") and not args.test:
                    time.sleep(2.0)
                    
                total_idx += current_batch_size
                generated_for_type += current_batch_size

    # Save to output file
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(bank, f, indent=2, ensure_ascii=False)

    print(f"\n✨ Generation completed! Successfully saved {len(bank)} items to {args.out}")

if __name__ == "__main__":
    main()