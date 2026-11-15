"""Which Postgres schema c2c reads and writes (ADR-001, N2).

c2c shares the Talia Supabase project with other apps. Its tables are moving
from `public` to a dedicated schema: `c2c` (production) and `c2c_stg`
(staging). Every Supabase client must be created through `make_client` so the
schema comes from one place.

  C2C_DB_SCHEMA = public | c2c | c2c_stg     (default: public until N4 moves the tables)

Guard: a production deployment can never use the staging schema, and a
preview/development deployment can never use the production schema. Vercel
sets VERCEL_ENV to production | preview | development.
"""
import os
from typing import Optional

ALLOWED_SCHEMAS = ("public", "c2c", "c2c_stg")
DEFAULT_SCHEMA = "public"


class SchemaConfigError(RuntimeError):
    pass


def db_schema(env: Optional[dict] = None) -> str:
    env = os.environ if env is None else env
    # strip() alone keeps a UTF-8 BOM (\ufeff): a BOM-prefixed value from a Windows
    # pipe took production down during the N4 cutover (2026-11-15).
    schema = (env.get("C2C_DB_SCHEMA") or DEFAULT_SCHEMA).strip().lstrip("\ufeff").strip() or DEFAULT_SCHEMA
    if schema not in ALLOWED_SCHEMAS:
        raise SchemaConfigError(f"C2C_DB_SCHEMA={schema!r} is not one of {ALLOWED_SCHEMAS}")
    deploy_env = (env.get("VERCEL_ENV") or "").strip().lower()
    if deploy_env == "production" and schema == "c2c_stg":
        raise SchemaConfigError("Production deployment must not use the staging schema c2c_stg")
    if deploy_env in ("preview", "development") and schema == "c2c":
        raise SchemaConfigError(f"{deploy_env} deployment must not use the production schema c2c")
    return schema


def make_client(url: str, key: str):
    """create_client bound to the configured c2c schema. Auth is unaffected."""
    from supabase import ClientOptions, create_client
    return create_client(url, key, options=ClientOptions(schema=db_schema()))
