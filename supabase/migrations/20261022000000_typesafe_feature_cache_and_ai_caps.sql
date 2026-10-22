-- TypeSafe feature cache, AI call ledger and database-enforced daily call caps.
-- Caps are call counts. Prices and budget are entered by an admin and only inform display.

-- ── Settings (single row) ──────────────────────────────────────────────────
create table if not exists public.ai_settings (
  id boolean primary key default true check (id),
  -- null = uncapped
  account_max_calls_per_day int check (account_max_calls_per_day >= 0),
  -- 0 switches the feature off; null = uncapped
  featurize_max_calls_per_day int check (featurize_max_calls_per_day >= 0),
  evaluate_max_calls_per_day int check (evaluate_max_calls_per_day >= 0),
  price_per_call_inr numeric check (price_per_call_inr >= 0),
  monthly_budget_inr numeric check (monthly_budget_inr >= 0),
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.ai_settings (id, account_max_calls_per_day, featurize_max_calls_per_day, evaluate_max_calls_per_day)
values (true, 500, 300, 200)
on conflict (id) do nothing;

-- ── Ledger: one row per paid call (claimed before the call is made) ───────
create table if not exists public.ai_call_ledger (
  id bigserial primary key,
  source text not null check (source in ('typesafe_featurize', 'typesafe_evaluate')),
  student_id uuid,
  outcome text not null default 'claimed' check (outcome in ('claimed', 'ok', 'error')),
  called_at timestamptz not null default now()
);
create index if not exists ai_call_ledger_called_at_idx on public.ai_call_ledger (called_at);

-- ── Feature cache: reused until the profile text (hash) changes ───────────
create table if not exists public.candidate_features (
  student_id uuid primary key references public.students(id) on delete cascade,
  input_hash text not null,
  featurize_response jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ai_settings enable row level security;
alter table public.ai_call_ledger enable row level security;
alter table public.candidate_features enable row level security;
-- No policies: only the service role (backend) reads or writes these tables.

-- ── Day start in the customer's timezone (IST), never UTC midnight ────────
create or replace function public.ai_day_start()
returns timestamptz
language sql stable
as $$
  select (date_trunc('day', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata'
$$;

-- ── Claim one paid call, or refuse it, before the call is made ────────────
create or replace function public.claim_ai_call(p_source text, p_student_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.ai_settings;
  feature_cap int;
  used_feature int;
  used_total int;
  new_id bigint;
begin
  -- Row lock serialises concurrent claims so a cap cannot be overshot.
  select * into s from public.ai_settings where id for update;

  feature_cap := case p_source
    when 'typesafe_featurize' then s.featurize_max_calls_per_day
    when 'typesafe_evaluate' then s.evaluate_max_calls_per_day
  end;
  if p_source not in ('typesafe_featurize', 'typesafe_evaluate') then
    raise exception 'unknown AI call source: %', p_source;
  end if;

  if feature_cap = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'feature_disabled');
  end if;

  select count(*) filter (where source = p_source), count(*)
    into used_feature, used_total
    from public.ai_call_ledger
   where called_at >= public.ai_day_start();

  if feature_cap is not null and used_feature >= feature_cap then
    return jsonb_build_object('allowed', false, 'reason', 'daily_cap_reached');
  end if;
  if s.account_max_calls_per_day is not null and used_total >= s.account_max_calls_per_day then
    return jsonb_build_object('allowed', false, 'reason', 'account_daily_cap_reached');
  end if;

  insert into public.ai_call_ledger (source, student_id) values (p_source, p_student_id)
  returning id into new_id;
  return jsonb_build_object('allowed', true, 'ledger_id', new_id);
end;
$$;

create or replace function public.finish_ai_call(p_ledger_id bigint, p_outcome text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_call_ledger set outcome = p_outcome where id = p_ledger_id and outcome = 'claimed'
$$;

revoke execute on function public.claim_ai_call(text, uuid) from public, anon, authenticated;
revoke execute on function public.finish_ai_call(bigint, text) from public, anon, authenticated;
grant execute on function public.claim_ai_call(text, uuid) to service_role;
grant execute on function public.finish_ai_call(bigint, text) to service_role;
