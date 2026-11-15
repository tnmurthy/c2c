"""N2: configurable c2c schema + deployment guard."""
import pytest

from api.db_schema import SchemaConfigError, db_schema, make_client


def test_default_is_public_until_tables_move():
    assert db_schema({}) == "public"


@pytest.mark.parametrize("schema", ["public", "c2c", "c2c_stg"])
def test_allowed_schemas_locally(schema):
    assert db_schema({"C2C_DB_SCHEMA": schema}) == schema


def test_unknown_schema_rejected():
    with pytest.raises(SchemaConfigError):
        db_schema({"C2C_DB_SCHEMA": "telangana"})


@pytest.mark.parametrize("vercel_env,schema,ok", [
    ("production", "c2c", True), ("production", "public", True), ("production", "c2c_stg", False),
    ("preview", "c2c_stg", True), ("preview", "public", True), ("preview", "c2c", False),
    ("development", "c2c", False),
])
def test_deployment_guard(vercel_env, schema, ok):
    env = {"VERCEL_ENV": vercel_env, "C2C_DB_SCHEMA": schema}
    if ok:
        assert db_schema(env) == schema
    else:
        with pytest.raises(SchemaConfigError):
            db_schema(env)


def test_make_client_binds_schema(monkeypatch):
    seen = {}
    import supabase
    monkeypatch.setattr(supabase, "create_client", lambda url, key, options=None: seen.setdefault("schema", options.schema))
    monkeypatch.setenv("C2C_DB_SCHEMA", "c2c_stg")
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    make_client("https://x.supabase.co", "k")
    assert seen["schema"] == "c2c_stg"
