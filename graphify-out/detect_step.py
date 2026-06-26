import json
from graphify.detect import detect
from pathlib import Path

result = detect(Path('C:/tt-ai-stack/01_projects/makeover-talent-agency'))
Path('graphify-out/.graphify_detect.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
print("Detect complete")
