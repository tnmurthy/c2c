-- AI spend summary and admin setter for the Costs page.
-- Called by the backend with the service role after it has checked the caller's role.

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
           count(*) filter (where source = 'typesafe_evaluate') as evaluate_calls
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
           count(*) filter (where source = 'typesafe_evaluate') as evaluate_calls
    from public.ai_call_ledger, bounds b
    where called_at >= b.today_start
  )
  select jsonb_build_object(
    'today', b.today,
    'today_calls', jsonb_build_object('featurize_calls', t.featurize_calls, 'evaluate_calls', t.evaluate_calls),
    'month_to_date_calls', m.calls,
    'month_error_calls', m.error_calls,
    'projected_month_calls', round(m.calls::numeric / greatest(b.days_elapsed, 1) * b.days_in_month)::int,
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', d.day,
               'featurize_calls', coalesce(p.featurize_calls, 0),
               'evaluate_calls', coalesce(p.evaluate_calls, 0)) order by d.day), '[]'::jsonb)
      from days d left join per_day p using (day)
    ),
    'account_max_calls_per_day', s.account_max_calls_per_day,
    'featurize_max_calls_per_day', s.featurize_max_calls_per_day,
    'evaluate_max_calls_per_day', s.evaluate_max_calls_per_day,
    'price_per_call_inr', s.price_per_call_inr,
    'monthly_budget_inr', s.monthly_budget_inr,
    'settings_updated_at', s.updated_at
  )
  from bounds b, month m, today t, public.ai_settings s
$$;

-- Replaces every cap, price and budget at once. null = uncapped / not set.
create or replace function public.set_ai_settings(
  p_account_max_calls_per_day int,
  p_featurize_max_calls_per_day int,
  p_evaluate_max_calls_per_day int,
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
         price_per_call_inr = p_price_per_call_inr,
         monthly_budget_inr = p_monthly_budget_inr,
         updated_by = p_updated_by,
         updated_at = now()
   where id
$$;

revoke execute on function public.ai_spend_summary(int) from public, anon, authenticated;
revoke execute on function public.set_ai_settings(int, int, int, numeric, numeric, uuid) from public, anon, authenticated;
grant execute on function public.ai_spend_summary(int) to service_role;
grant execute on function public.set_ai_settings(int, int, int, numeric, numeric, uuid) to service_role;
