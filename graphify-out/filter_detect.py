import json
from pathlib import Path

detect_path = Path('graphify-out/.graphify_detect.json')
data = json.loads(detect_path.read_text(encoding='utf-8'))

ignore_patterns = [
    '\\graphify\\',
    '\\.next\\',
    '\\node_modules\\',
    '\\playwright-report\\',
    '\\test-results\\',
    '\\__pycache__\\',
    '\\.venv\\',
    '\\.git\\'
]

filtered_files = {}
for category, files in data.get('files', {}).items():
    filtered_list = []
    for f in files:
        if any(pat in f for pat in ignore_patterns):
            continue
        filtered_list.append(f)
    filtered_files[category] = filtered_list

data['files'] = filtered_files
total_files = sum(len(lst) for lst in filtered_files.values())
data['total_files'] = total_files

detect_path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
print(f"Filtered: {total_files} files remaining.")
for cat, lst in filtered_files.items():
    if lst:
        print(f"  {cat}: {len(lst)} files")
