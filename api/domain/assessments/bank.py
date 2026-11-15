"""Question bank: load items (DB first, bundled fallback JSON second) and pick
a de-duplicated question set. Moved from api/routers/assessment_router.py (R1).
"""
import json
import logging
import os
import random
import re
from typing import Any, Callable, Dict, List

from api.domain.assessments.scoring import DIMENSIONS

logger = logging.getLogger("c2c_api.assessment")

# api/fallback_bank.json
FALLBACK_BANK_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "fallback_bank.json",
)


def normalize_bank_item(item: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(item)
    if "ID" in normalized and "id" not in normalized:
        normalized["id"] = normalized["ID"]
    if "type" in normalized and "item_type" not in normalized:
        normalized["item_type"] = normalized["type"]
    sl = normalized.get("scoring_logic")
    if isinstance(sl, str):
        normalized["scoring_logic"] = {"raw": sl}
    return normalized


def select_distinct_items(items: List[Dict[str, Any]], count: int, seen_fingerprints: set) -> List[Dict[str, Any]]:
    """
    Randomly selects `count` items from `items` ensuring that no two items share
    identical or near-identical stems across the assessment session.
    """
    shuffled = list(items)
    random.shuffle(shuffled)
    chosen = []
    for item in shuffled:
        stem = item.get("stem") or item.get("text") or ""
        fp = re.sub(r'[^a-zA-Z0-9]', '', stem).lower()[:50]
        if not fp or fp in seen_fingerprints:
            continue
        seen_fingerprints.add(fp)
        chosen.append(item)
        if len(chosen) >= count:
            break
    return chosen


def load_fallback_bank() -> List[Dict[str, Any]]:
    """Bundled item bank, normalised. Raises on read/parse failure; callers decide."""
    with open(FALLBACK_BANK_PATH, "r", encoding="utf-8") as f:
        return [normalize_bank_item(item) for item in json.load(f)]


def try_load_fallback_bank() -> List[Dict[str, Any]]:
    try:
        return load_fallback_bank()
    except Exception as e:
        logger.warning(f"Failed to load fallback bank: {e}")
        return []


def build_question_set(client, count_for: Callable[[List[Dict[str, Any]]], int]) -> List[Dict[str, Any]]:
    """Pick distinct items per 5Q dimension (DB, else fallback) and shuffle.

    count_for(items) returns how many to pick from that dimension's pool.
    """
    bank_data = try_load_fallback_bank()
    selected: List[Dict[str, Any]] = []
    seen_fingerprints: set = set()
    for dim in DIMENSIONS:
        items: List[Dict[str, Any]] = []
        try:
            res = client.table("psychometric_items").select("*").eq("primary_dimension", dim).execute()
            items = res.data or []
        except Exception as e:
            logger.warning(f"Failed to fetch psychometric_items for {dim}: {e}")
        if not items and bank_data:
            items = [item for item in bank_data if item.get("primary_dimension") == dim]
        if items:
            selected.extend(select_distinct_items(items, count_for(items), seen_fingerprints))
    random.shuffle(selected)
    return selected


def items_for_submission(client, item_ids: List[Any]) -> Dict[Any, Dict[str, Any]]:
    """Map item_id -> item for the submitted responses (DB, else fallback)."""
    items_map: Dict[Any, Dict[str, Any]] = {}
    try:
        items_res = client.table("psychometric_items").select("*").in_("id", item_ids).execute()
        items_map = {item["id"]: item for item in items_res.data}
    except Exception as e:
        logger.warning(f"Failed to query psychometric_items: {e}")
    if not items_map:
        try:
            items_map = {item["id"]: item for item in load_fallback_bank() if item.get("id") in item_ids}
        except Exception as e:
            logger.warning(f"Failed to load fallback bank: {e}")
    return items_map
