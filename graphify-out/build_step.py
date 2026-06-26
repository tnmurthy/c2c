import sys
from pathlib import Path

# Add local graphify development folder to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root / "graphify"))

import json
import traceback
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json

def main():
    for _stream in (sys.stdout, sys.stderr):
        if _stream is not None and hasattr(_stream, "reconfigure"):
            try:
                _stream.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass
    try:
        print("Starting step 4: Build, Cluster, Analyze...")
        
        # Load files
        extraction_path = Path("graphify-out/.graphify_extract.json")
        detection_path = Path("graphify-out/.graphify_detect.json")
        
        if not extraction_path.exists():
            print("Error: extraction file missing.")
            sys.exit(1)
            
        extraction = json.loads(extraction_path.read_text(encoding="utf-8"))
        detection = json.loads(detection_path.read_text(encoding="utf-8"))
        
        # Build graph
        G = build_from_json(extraction, root=".", directed=False)
        if G.number_of_nodes() == 0:
            print("ERROR: Graph is empty - extraction produced no nodes.")
            sys.exit(1)
            
        # Cluster and Score
        communities = cluster(G)
        cohesion = score_all(G, communities)
        
        tokens = {
            "input": extraction.get("input_tokens", 0),
            "output": extraction.get("output_tokens", 0)
        }
        
        # Analyze
        try:
            gods = god_nodes(G)
        except Exception:
            gods = []
            
        try:
            surprises = surprising_connections(G, communities)
        except Exception:
            surprises = []
            
        # Standard placeholder labels
        labels = {cid: f"Community {cid}" for cid in communities}
        questions = suggest_questions(G, communities, labels)
        
        # Generate initial report
        report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, ".", suggested_questions=questions)
        Path("graphify-out/GRAPH_REPORT.md").write_text(report, encoding="utf-8")
        
        # Save graph.json
        wrote = to_json(G, communities, "graphify-out/graph.json", force=True)
        if not wrote:
            print("ERROR: refused to shrink graphify-out/graph.json")
            sys.exit(1)
            
        # Save analysis
        analysis = {
            "communities": {str(k): v for k, v in communities.items()},
            "cohesion": {str(k): v for k, v in cohesion.items()},
            "gods": gods,
            "surprises": surprises,
            "questions": questions,
        }
        Path("graphify-out/.graphify_analysis.json").write_text(
            json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        
        print(f"Graph successfully built: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities.")
        
        # Print top nodes for each community so the agent can label them
        print("\n--- COMMUNITY SAMPLE FOR LABELING ---")
        for cid in sorted(communities.keys()):
            nodes_in_comm = communities[cid]
            # Get node info
            node_labels = []
            for nid in nodes_in_comm[:15]:
                label = G.nodes[nid].get("label", nid)
                node_labels.append(label)
            if len(nodes_in_comm) > 0:
                print(f"Community {cid} ({len(nodes_in_comm)} nodes): {', '.join(node_labels)}")
            
        sys.exit(0)
        
    except Exception as e:
        print("Build failed with error:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
