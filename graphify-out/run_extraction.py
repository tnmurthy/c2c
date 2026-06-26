import sys
from pathlib import Path

# Add local graphify development folder to path so all submodules are importable
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root / "graphify"))

import json
import traceback
from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.llm import extract_corpus_parallel
from graphify.cache import check_semantic_cache, save_semantic_cache

def main():
    try:
        print("Starting step 3: Extraction...")
        detect_path = Path("graphify-out/.graphify_detect.json")
        if not detect_path.exists():
            print("Error: detect file missing. Running detect first...")
            d = detect(Path("."))
            detect_path.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
        else:
            d = json.loads(detect_path.read_text(encoding="utf-8"))

        # 1. AST Extraction
        code_files = []
        for f in d.get("files", {}).get("code", []):
            code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])

        ast_result = {"nodes": [], "edges": [], "input_tokens": 0, "output_tokens": 0}
        if code_files:
            print(f"Running AST extraction on {len(code_files)} code files...")
            ast_result = extract(code_files, cache_root=Path("."))
            Path("graphify-out/.graphify_ast.json").write_text(
                json.dumps(ast_result, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            print(f"AST: {len(ast_result['nodes'])} nodes, {len(ast_result['edges'])} edges")
        else:
            Path("graphify-out/.graphify_ast.json").write_text(
                json.dumps(ast_result, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            print("No code files found. Skipping AST.")

        # 2. Semantic cache check
        all_semantic = [f for cat in ("document", "paper", "image") for f in d["files"].get(cat, [])]
        print(f"Total semantic files detected: {len(all_semantic)}")

        cached_nodes, cached_edges, cached_hyperedges, uncached_paths = check_semantic_cache(all_semantic, root=".")
        print(f"Cache check: {len(all_semantic) - len(uncached_paths)} hit, {len(uncached_paths)} miss")

        if cached_nodes or cached_edges or cached_hyperedges:
            cached_data = {"nodes": cached_nodes, "edges": cached_edges, "hyperedges": cached_hyperedges}
            Path("graphify-out/.graphify_cached.json").write_text(
                json.dumps(cached_data, ensure_ascii=False), encoding="utf-8"
            )
        else:
            cached_data = {"nodes": [], "edges": [], "hyperedges": []}
            Path("graphify-out/.graphify_cached.json").unlink(missing_ok=True)

        # 3. Semantic Extraction
        fresh = {"nodes": [], "edges": [], "hyperedges": [], "input_tokens": 0, "output_tokens": 0}
        if uncached_paths:
            print(f"Running parallel semantic extraction on {len(uncached_paths)} uncached files via Gemini...")
            # We convert strings to Path objects
            uncached_path_objs = [Path(p) for p in uncached_paths]
            fresh = extract_corpus_parallel(uncached_path_objs, backend="gemini", root=Path("."))
            # Save semantic extraction result
            Path("graphify-out/.graphify_semantic.json").write_text(
                json.dumps(fresh, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            print(f"Semantic Extraction: {len(fresh.get('nodes', []))} nodes, {len(fresh.get('edges', []))} edges")
            # Cache the newly extracted results
            saved = save_semantic_cache(fresh.get("nodes", []), fresh.get("edges", []), fresh.get("hyperedges", []), root=".")
            print(f"Cached {saved} files successfully.")
        else:
            Path("graphify-out/.graphify_semantic.json").write_text(
                json.dumps(fresh, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            print("No uncached semantic files to extract.")

        # 4. Merge AST + Semantic
        # Merge cached + fresh semantic
        all_sem_nodes = cached_data.get("nodes", []) + fresh.get("nodes", [])
        all_sem_edges = cached_data.get("edges", []) + fresh.get("edges", [])
        all_sem_hyperedges = cached_data.get("hyperedges", []) + fresh.get("hyperedges", [])

        # De-duplicate semantic nodes
        seen_sem = set()
        deduped_sem_nodes = []
        for n in all_sem_nodes:
            if n["id"] not in seen_sem:
                seen_sem.add(n["id"])
                deduped_sem_nodes.append(n)

        # Merge AST + Semantic
        seen = {n["id"] for n in ast_result["nodes"]}
        merged_nodes = list(ast_result["nodes"])
        for n in deduped_sem_nodes:
            if n["id"] not in seen:
                merged_nodes.append(n)
                seen.add(n["id"])

        merged_edges = ast_result["edges"] + all_sem_edges
        merged_hyperedges = all_sem_hyperedges

        merged = {
            "nodes": merged_nodes,
            "edges": merged_edges,
            "hyperedges": merged_hyperedges,
            "input_tokens": fresh.get("input_tokens", 0),
            "output_tokens": fresh.get("output_tokens", 0),
        }
        Path("graphify-out/.graphify_extract.json").write_text(
            json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"Merge Complete: {len(merged_nodes)} nodes, {len(merged_edges)} edges")
        print("Extraction step completed successfully.")
        sys.exit(0)

    except Exception as e:
        print("Extraction failed with error:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
