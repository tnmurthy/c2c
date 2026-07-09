import os
import json
import random

# Get the project root directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))

bank_path = os.path.join(PROJECT_ROOT, "api", "fallback_bank.json")
with open(bank_path, 'r', encoding='utf-8') as f:
    bank = json.load(f)

# Quick uniqueness check
ids = [q.get('id') or q.get('ID') for q in bank]
stems = [q.get('stem') for q in bank]
print(f'Total items: {len(bank)}')
print(f'Unique IDs: {len(set(ids))}')
print(f'Unique Stems: {len(set(stems))}')

# Group by dimension
dims = {'IQ': [], 'EQ': [], 'SQ': [], 'AQ': [], 'SpQ': []}
for q in bank:
    dim = q.get('primary_dimension', 'UNKNOWN')
    if dim in dims:
        dims[dim].append(q)

# Sample 5 from each
sample = []
for dim, qs in dims.items():
    if len(qs) >= 5:
        sample.extend(random.sample(qs, 5))
    else:
        sample.extend(qs)

random.shuffle(sample)

print('\n--- YOUR RANDOM 25-QUESTION C2C ASSESSMENT ---')
for i, q in enumerate(sample, 1):
    dim = q.get("primary_dimension", "Unknown")
    itype = q.get("item_type") or q.get("type", "Unknown")
    print(f'\nQ{i} [{dim}] ({itype.upper()})')
    print(f'Scenario/Stem: {q.get("stem")}')
    
    opts = q.get('options')
    if opts and isinstance(opts, list):
        for opt in opts:
            label = opt.get("label", "")
            text = opt.get("text", "")
            print(f'  {label}: {text}')
    elif opts and isinstance(opts, dict):
        for k, v in opts.items():
            print(f'  {k}: {v}')
    elif 'likert' in itype.lower():
        print('  Scale: 1 (Strongly Disagree) to 5 (Strongly Agree)')
