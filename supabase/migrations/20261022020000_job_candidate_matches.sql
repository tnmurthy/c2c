-- P3-B: ranked candidates per job, and TypeSafe requirement matching as a third metered AI source.
-- Matches get their own table: `leads` is the CRM sales-lead table and holds no student data.

create table if not exists public.job_candidate_matches (
  job_id uuid not null references public.job_postings(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  fit_score numeric not null check (fit_score between 0 and 100),
  five_q_score numeric not null check (five_q_score between 0 and 100),
  -- null when requirement evidence was not judged (outside the judged shortlist, cap reached, or no profile text)
  evidence_score numeric check (evidence_score between 0 and 100),
  evidence jsonb not null default '{}'::jsonb,
  input_hash text,
  rank int not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'SHORTLISTED', 'REJECTED', 'CONTACTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (job_id, student_id)
);
create index if not exists job_candidate_matches_job_rank_idx on public.job_candidate_matches (job_id, rank);
alter table public.job_candidate_matches enable row level security;

-- ── Third metered source ──────────────────────────────────────────────────
alter table public.ai_call_ledger drop constraint if exists ai_call_ledger_source_check;
alter table public.ai_call_ledger add constraint ai_call_ledger_source_check
  check (source in ('typesafe_featurize', 'typesafe_evaluate', 'typesafe_match'));

alter table public.ai_settings add column if not exists match_max_calls_per_day int
  check (match_max_calls_per_day >= 0);
update public.ai_settings set match_max_calls_per_day = 200 where id and match_max_calls_per_day is null;

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
  if p_source not in ('typesafe_featurize', 'typesafe_evaluate', 'typesafe_match') then
    raise exception 'unknown AI call source: %', p_source;
  end if;

  -- Row lock serialises concurrent claims so a cap cannot be overshot.
  select * into s from public.ai_settings where id for update;

  feature_cap := case p_source
    when 'typesafe_featurize' then s.featurize_max_calls_per_day
    when 'typesafe_evaluate' then s.evaluate_max_calls_per_day
    when 'typesafe_match' then s.match_max_calls_per_day
  end;

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

create or replace function public.ai_spend_summary(p_days int default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      public.ai_day_start() as today_start,
      (date_trunc('month', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata' as month_start,
      (now() at time zone 'Asia/Kolkata')::date as today,
      extract(day from now() at time zone 'Asia/Kolkata')::int as days_elapsed,
      extract(day from (date_trunc('month', now() at time zone 'Asia/Kolkata') + interval '1 month - 1 day'))::int as days_in_month
  ),
  days as (
    select generate_series(b.today - (greatest(p_days, 1) - 1), b.today, interval '1 day')::date as day
    from bounds b
  ),
  per_day as (
    select (called_at at time zone 'Asia/Kolkata')::date as day,
           count(*) filter (where source = 'typesafe_featurize') as featurize_calls,
           count(*) filter (where source = 'typesafe_evaluate') as evaluate_calls,
           count(*) filter (where source = 'typesafe_match') as match_calls
    from public.ai_call_ledger, bounds b
    where called_at >= b.today_start - make_interval(days => greatest(p_days, 1) - 1)
    group by 1
  ),
  month as (
    select count(*) as calls,
           count(*) filter (where outcome = 'error') as error_calls
    from public.ai_call_ledger, bounds b
    where called_at >= b.month_start
  ),
  today as (
    select count(*) filter (where source = 'typesafe_featurize') as featurize_calls,
           count(*) filter (where source = 'typesafe_evaluate') as evaluate_calls,
           count(*) filter (where source = 'typesafe_match') as match_calls
    from public.ai_call_ledger, bounds b
    where called_at >= b.today_start
  )
  select jsonb_build_object(
    'today', b.today,
    'today_calls', jsonb_build_object(
      'featurize_calls', t.featurize_calls, 'evaluate_calls', t.evaluate_calls, 'match_calls', t.match_calls),
    'month_to_date_calls', m.calls,
    'month_error_calls', m.error_calls,
    'projected_month_calls', round(m.calls::numeric / greatest(b.days_elapsed, 1) * b.days_in_month)::int,
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', d.day,
               'featurize_calls', coalesce(p.featurize_calls, 0),
               'evaluate_calls', coalesce(p.evaluate_calls, 0),
               'match_calls', coalesce(p.match_calls, 0)) order by d.day), '[]'::jsonb)
      from days d left join per_day p using (day)
    ),
    'account_max_calls_per_day', s.account_max_calls_per_day,
    'featurize_max_calls_per_day', s.featurize_max_calls_per_day,
    'evaluate_max_calls_per_day', s.evaluate_max_calls_per_day,
    'match_max_calls_per_day', s.match_max_calls_per_day,
    'price_per_call_inr', s.price_per_call_inr,
    'monthly_budget_inr', s.monthly_budget_inr,
    'settings_updated_at', s.updated_at
  )
  from bounds b, month m, today t, public.ai_settings s
$$;

-- The 6-argument set_ai_settings stays so an older deployed backend keeps working
-- during the rollout; it leaves match_max_calls_per_day unchanged. Drop it later.

create or replace function public.set_ai_settings(
  p_account_max_calls_per_day int,
  p_featurize_max_calls_per_day int,
  p_evaluate_max_calls_per_day int,
  p_match_max_calls_per_day int,
  p_price_per_call_inr numeric,
  p_monthly_budget_inr numeric,
  p_updated_by uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_settings
     set account_max_calls_per_day = p_account_max_calls_per_day,
         featurize_max_calls_per_day = p_featurize_max_calls_per_day,
         evaluate_max_calls_per_day = p_evaluate_max_calls_per_day,
         match_max_calls_per_day = p_match_max_calls_per_day,
         price_per_call_inr = p_price_per_call_inr,
         monthly_budget_inr = p_monthly_budget_inr,
         updated_by = p_updated_by,
         updated_at = now()
   where id
$$;

revoke execute on function public.set_ai_settings(int, int, int, int, numeric, numeric, uuid) from public, anon, authenticated;
grant execute on function public.set_ai_settings(int, int, int, int, numeric, numeric, uuid) to service_role;
