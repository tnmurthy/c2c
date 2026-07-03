import json
from graphify.cache import save_semantic_cache
from pathlib import Path
import os
import shutil

chunk1 = Path('graphify-out/.graphify_chunk_1.json')
if chunk1.exists():
    shutil.copy(chunk1, Path('graphify-out/.graphify_semantic_new.json'))

new_path = Path('graphify-out/.graphify_semantic_new.json')
new = json.loads(new_path.read_text()) if new_path.exists() else {'nodes':[],'edges':[],'hyperedges':[]}
saved = save_semantic_cache(new.get('nodes', []), new.get('edges', []), new.get('hyperedges', []))
print(f'Cached {saved} files')

cached_path = Path('graphify-out/.graphify_cached.json')
cached = json.loads(cached_path.read_text()) if cached_path.exists() else {'nodes':[],'edges':[],'hyperedges':[]}

all_nodes = cached.get('nodes', []) + new.get('nodes', [])
all_edges = cached.get('edges', []) + new.get('edges', [])
all_hyperedges = cached.get('hyperedges', []) + new.get('hyperedges', [])
seen = set()
deduped = []
for n in all_nodes:
    if n['id'] not in seen:
        seen.add(n['id'])
        deduped.append(n)

merged_sem = {
    'nodes': deduped,
    'edges': all_edges,
    'hyperedges': all_hyperedges,
    'input_tokens': new.get('input_tokens', 0),
    'output_tokens': new.get('output_tokens', 0),
}
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps(merged_sem, indent=2))
print(f'Extraction complete - {len(deduped)} nodes, {len(all_edges)} edges ({len(cached.get("nodes", []))} from cache, {len(new.get("nodes",[]))} new)')

ast = {'nodes': [], 'edges': []}
sem = merged_sem

seen_ast = {n['id'] for n in ast['nodes']}
merged_nodes = list(ast['nodes'])
for n in sem['nodes']:
    if n['id'] not in seen_ast:
        merged_nodes.append(n)
        seen_ast.add(n['id'])

merged_edges = ast['edges'] + sem['edges']
merged_hyperedges = sem.get('hyperedges', [])
merged = {
    'nodes': merged_nodes,
    'edges': merged_edges,
    'hyperedges': merged_hyperedges,
    'input_tokens': sem.get('input_tokens', 0),
    'output_tokens': sem.get('output_tokens', 0),
}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, indent=2))
total = len(merged_nodes)
edges = len(merged_edges)
print(f'Merged: {total} nodes, {edges} edges (0 AST + {len(sem["nodes"])} semantic)')
