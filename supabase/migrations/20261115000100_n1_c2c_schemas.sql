-- N1 (2026-11-15): dedicated schemas for c2c in the shared Talia database.
--   c2c      production (tables move here in N4; still in public until then)
--   c2c_stg  staging (built by replaying migrations in N3)
-- Same pattern as the telangana / vizag / tool_hub / innovat schemas.
-- Both are empty after this migration. Nothing reads them until C2C_DB_SCHEMA
-- is switched (N2 keeps the default at public).
--
-- Manual step (owner): Supabase Dashboard -> Project Settings -> Data API ->
-- Exposed schemas: add c2c and c2c_stg.

create schema if not exists c2c;
create schema if not exists c2c_stg;

comment on schema c2c     is 'c2c (Campus to Corporate) production. Owner: Talia Technologies.';
comment on schema c2c_stg is 'c2c staging. Never referenced by production deployments.';

do $$
declare s text;
begin
  foreach s in array array['c2c', 'c2c_stg'] loop
    execute format('grant usage on schema %I to anon, authenticated, service_role', s);
    -- Table access is still governed by RLS policies on each table.
    execute format('alter default privileges in schema %I grant all on tables to anon, authenticated, service_role', s);
    execute format('alter default privileges in schema %I grant all on sequences to anon, authenticated, service_role', s);
    execute format('alter default privileges in schema %I grant execute on functions to service_role', s);
  end loop;
end $$;

-- New functions are not executable by anon/authenticated by default (GO_LIVE B6).
alter default privileges in schema c2c     revoke execute on functions from public;
alter default privileges in schema c2c_stg revoke execute on functions from public;
