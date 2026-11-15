import os
from supabase import ClientOptions, create_client, Client

_client: Client = None

def get_client():
    global _client
    if _client is None:
        # Strip BOM / quotes / newlines that pasted secrets can carry (see config_env.py).
        _clean = lambda v: (v or "").strip(" \t\r\n\ufeff\"'") or None
        url = _clean(os.environ.get("SUPABASE_URL"))
        key = _clean(os.environ.get("SUPABASE_KEY"))
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
        # Same schema switch as api/db_schema.py (this service runs standalone).
        schema = (os.environ.get("C2C_DB_SCHEMA") or "public").strip().lstrip("\ufeff").strip() or "public"
        if schema not in ("public", "c2c", "c2c_stg"):
            raise ValueError(f"C2C_DB_SCHEMA={schema!r} is not allowed")
        _client = create_client(url, key, options=ClientOptions(schema=schema))
    return _client

def get_existing_urls(table: str) -> set[str]:
    """Fetch existing URLs for deduplication."""
    try:
        client = get_client()
        # Fetching only URLs for efficiency
        resp = client.table(table).select("url").execute()
        return {row['url'] for row in resp.data}
    except Exception as e:
        print(f"[Supabase] Error fetching existing URLs: {e}")
        return set()

_MISSING = object()


def get_existing_scores(table: str) -> dict:
    """url -> ai_score (None = stored unscored). Empty dict on error."""
    try:
        resp = get_client().table(table).select("url, ai_score").execute()
        return {row["url"]: row.get("ai_score") for row in resp.data}
    except Exception as e:
        print(f"[Supabase] Error fetching existing scores: {e}")
        return {}


def split_for_scoring(items: list[dict], existing: dict) -> tuple[list[dict], list[dict]]:
    """(to_score, already_scored): only new URLs and stored-but-unscored ones go to the AI,
    so each run does not spend the daily Gemini cap re-scoring known jobs."""
    to_score, done = [], []
    for item in items:
        prior = existing.get(item.get("url"), _MISSING)
        (to_score if prior is _MISSING or prior is None else done).append(item)
    return to_score, done


def sync(table: str, items: list[dict]) -> tuple[int, int]:
    """Insert new items; fill in AI fields for rows stored unscored. Returns (added, skipped)."""
    if not items:
        return 0, 0

    existing = get_existing_scores(table)
    to_insert = []
    rescored = 0

    for item in items:
        url = item.get("url")
        if url in existing:
            # A row stored unscored (AI was unavailable) gets its score once one exists.
            if existing[url] is None and item.get("ai_score") is not None:
                try:
                    get_client().table(table).update({
                        "ai_score": item.get("ai_score"),
                        "ai_summary": item.get("ai_summary"),
                        "ai_notes": item.get("ai_notes"),
                    }).eq("url", url).execute()
                    rescored += 1
                except Exception as e:
                    print(f"[Supabase] Rescore failed for {url}: {e}")
            continue
        
        # Prepare record for Supabase
        record = {
            "name": item.get("name"),
            "url": item.get("url"),
            "company": item.get("company"),
            "source": item.get("source"),
            "date_found": item.get("date_found"),
            "ai_score": item.get("ai_score"),
            "ai_summary": item.get("ai_summary"),
            "ai_notes": item.get("ai_notes"),
            "status": "New"
        }
        to_insert.append(record)
    
    if rescored:
        print(f"[Supabase] Filled in scores for {rescored} previously unscored rows.")
    if not to_insert:
        return 0, len(items)
    
    try:
        client = get_client()
        # Batch insert
        client.table(table).upsert(to_insert).execute()
        return len(to_insert), len(items) - len(to_insert)
    except Exception as e:
        print(f"[Supabase] Push failed: {e}")
        return 0, 0
