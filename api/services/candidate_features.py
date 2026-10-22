"""
Cached TypeSafe featurization for candidate lists (CRM and employer views).

A student's features are computed once and reused until their profile text
changes (detected by hash). Only live TypeSafe results are cached; heuristic
estimates are free to recompute and must not block a later live result.
"""
import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List

from api.schemas.typesafe import TypeSafeFeaturizeResponse
from api.services.typesafe_heuristics import featurize_heuristic
from api.services.typesafe_service import DEFAULT_PROBES, typesafe_service

logger = logging.getLogger("c2c_api.candidate_features")

# Bump when DEFAULT_PROBES or their wording change, so cached rows are recomputed.
PROBE_VERSION = "v1"
# Bounds page latency and spend on a cold cache; the rest fill in on later loads.
MAX_LIVE_PER_REQUEST = 25
WORKERS = 8


def profile_text(student: Dict[str, Any]) -> str:
    skills = student.get("skills")
    skills_text = " ".join(skills) if isinstance(skills, list) else ""
    return f"{student.get('bio') or ''} {skills_text} {student.get('department') or ''}".strip()


def input_hash(text: str) -> str:
    return hashlib.sha256(f"{PROBE_VERSION}\n{text}".encode("utf-8")).hexdigest()


def to_telemetry(res: TypeSafeFeaturizeResponse) -> Dict[str, Any]:
    return {
        "numeric_vector": res.numeric_vector,
        "feature_names": res.feature_names,
        "features": {
            k: {"mean": v.mean, "spread_sd": v.spread_sd, "kind": v.kind, "interpretation": v.interpretation}
            for k, v in res.features.items()
        },
        "model_provider": res.model_provider,
        "is_live_api": res.is_live_api,
    }


def _load_cache(client, student_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    if not student_ids:
        return {}
    try:
        res = client.table("candidate_features").select("*").in_("student_id", student_ids).execute()
        return {row["student_id"]: row for row in (res.data or [])}
    except Exception as e:
        logger.warning("Candidate feature cache unavailable: %s", e)
        return {}


def _save_cache(client, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    try:
        client.table("candidate_features").upsert(rows).execute()
    except Exception as e:
        logger.warning("Could not write candidate feature cache: %s", e)


def features_for_students(client, students: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Returns {student_id: telemetry dict} for every student given."""
    texts = {s["id"]: profile_text(s) for s in students}
    names = {s["id"]: s.get("full_name") or "Candidate" for s in students}
    hashes = {sid: input_hash(t) for sid, t in texts.items()}
    cached = _load_cache(client, list(texts))

    results: Dict[str, TypeSafeFeaturizeResponse] = {}
    misses: List[str] = []
    for sid in texts:
        row = cached.get(sid)
        if row and row.get("input_hash") == hashes[sid]:
            results[sid] = TypeSafeFeaturizeResponse.model_validate(row["featurize_response"])
        else:
            misses.append(sid)

    live_batch = [sid for sid in misses if texts[sid]][:MAX_LIVE_PER_REQUEST]
    if live_batch:
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            computed = pool.map(
                lambda sid: (sid, typesafe_service.featurize(texts[sid], names[sid], student_id=sid)),
                live_batch,
            )
            results.update(dict(computed))

    for sid in misses:
        if sid not in results:
            results[sid] = featurize_heuristic(texts[sid], names[sid], DEFAULT_PROBES)

    _save_cache(client, [
        {"student_id": sid, "input_hash": hashes[sid], "featurize_response": results[sid].model_dump(mode="json")}
        for sid in live_batch
        if results[sid].is_live_api
    ])
    logger.info(
        "Candidate features: %d cached, %d computed live, %d heuristic",
        len(texts) - len(misses), sum(1 for sid in live_batch if results[sid].is_live_api),
        sum(1 for sid in texts if not results[sid].is_live_api),
    )
    return {sid: to_telemetry(res) for sid, res in results.items()}
