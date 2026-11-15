import os
from functools import lru_cache
from supabase import Client

from api.db_schema import make_client


@lru_cache(maxsize=1)
def get_anon_client() -> Client:
    return make_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    )


@lru_cache(maxsize=1)
def get_service_client() -> Client:
    return make_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )
