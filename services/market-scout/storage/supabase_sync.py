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

def sync(table: str, items: list[dict]) -> tuple[int, int]:
    """Upsert items into Supabase. Returns (added, skipped)."""
    if not items:
        return 0, 0
    
    existing = get_existing_urls(table)
    to_insert = []
    
    for item in items:
        if item.get("url") in existing:
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
