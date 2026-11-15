-- R4 (2026-11-16): partner API support.
--
--   partner_credentials   API keys a partner (eklav) uses to call /api/partners/{partner}/...
--                         Only sha256(secret) is stored; the key is shown once to the c2c admin
--                         who creates it. Revocable; last_used_at for hygiene.
--   partner_event_feed()  the gap-free read of partner_events for one partner: only tenants that
--                         enabled the partner, only finished transactions, only that partner's
--                         consent events.
--
-- Schema-agnostic: the target schema is set ONCE below (c2c_stg first, then c2c). Needs R3.

set local search_path = c2c_stg, extensions;

create table if not exists partner_credentials (
  id           uuid primary key default gen_random_uuid(),
  partner_id   text not null check (partner_id ~ '^[a-z0-9_-]+$'),
  key_prefix   text not null unique check (key_prefix ~ '^[a-z0-9]{8,16}$'),
  key_hash     text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  label        text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz,
  revoked_by   uuid references auth.users(id) on delete set null
);
create index if not exists partner_credentials_partner_idx on partner_credentials (partner_id) where revoked_at is null;
comment on table partner_credentials is 'R4: partner API keys (sha256 only). Backend only.';
alter table partner_credentials enable row level security;
revoke all on partner_credentials from anon, authenticated;

create or replace function partner_event_feed(p_partner text, p_after bigint, p_limit int)
returns setof partner_events
language sql stable set search_path from current as $$
  select e.*
    from partner_events e
    join tenant_partner_links l
      on l.tenant_id = e.tenant_id and l.partner_id = p_partner and l.enabled
   where e.id > coalesce(p_after, 0)
     and e.tx < pg_snapshot_xmin(pg_current_snapshot())      -- never past a still-running write
     and (e.type <> 'consent.upserted' or e.payload->>'partner_id' = p_partner)
   order by e.id
   limit least(greatest(coalesce(p_limit, 500), 1), 1000)
$$;
revoke execute on function partner_event_feed(text, bigint, int) from public, anon, authenticated;
grant execute on function partner_event_feed(text, bigint, int) to service_role;
