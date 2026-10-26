import React from 'react';
import type { AiCallCounts, AiSpendSummary } from '@/types/costs';

/** AI calls (TypeSafe and Gemini) today, this month and per day for 30 days; rupees only when a price is set. */

const inr = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** One entry per metered source, bottom of the stack first. */
const SERIES: { key: keyof AiCallCounts; label: string; short: string; color: string }[] = [
  { key: 'featurize_calls', label: 'Profile features', short: 'profile', color: 'bg-blue-500/80' },
  { key: 'match_calls', label: 'Job matching', short: 'match', color: 'bg-emerald-400/80' },
  { key: 'evaluate_calls', label: 'Assessment evaluation', short: 'assessment', color: 'bg-amber-400/80' },
  { key: 'gemini_scout_calls', label: 'Market scout (Gemini)', short: 'scout', color: 'bg-violet-400/80' },
  { key: 'gemini_item_gen_calls', label: 'Item generator (Gemini)', short: 'items', color: 'bg-rose-400/80' },
];

const count = (c: Partial<AiCallCounts>, key: keyof AiCallCounts) => Number(c[key] ?? 0);
const total = (c: Partial<AiCallCounts>) => SERIES.reduce((sum, s) => sum + count(c, s.key), 0);

function Tile({ label, calls, price, sub, warn }: {
  label: string; calls: number; price: number | null; sub?: string; warn?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${warn ? 'border-rose-500/50 bg-rose-950/30' : 'border-slate-800 bg-slate-900/60'}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-jetbrains text-2xl font-semibold tabular-nums ${warn ? 'text-rose-300' : 'text-white'}`}>
        {calls.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">calls</span>
      </p>
      <p className="mt-0.5 text-xs text-slate-400">{price === null ? (sub ?? ' ') : inr(calls * price)}</p>
    </div>
  );
}

export default function SpendSummary({ s }: { s: AiSpendSummary }) {
  const price = s.price_per_call_inr === null ? null : Number(s.price_per_call_inr);
  const budget = s.monthly_budget_inr === null ? null : Number(s.monthly_budget_inr);
  const today = total(s.today_calls);
  const projectedCost = price === null ? null : s.projected_month_calls * price;
  const overBudget = budget !== null && projectedCost !== null && projectedCost > budget;
  const busiest = Math.max(1, ...s.by_day.map(total));
  const todaySplit = SERIES.filter((x) => count(s.today_calls, x.key) > 0)
    .map((x) => `${count(s.today_calls, x.key)} ${x.short}`).join(' · ');

  return (
    <section aria-labelledby="spend-heading" className="rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 id="spend-heading" className="font-medium text-white">AI spend</h2>
        <p className="text-xs text-slate-500">TypeSafe and Gemini calls. Cached profiles and heuristic estimates make no call.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 lg:grid-cols-4">
        <Tile label="Today" calls={today} price={price} sub={todaySplit || 'No calls yet'} />
        <Tile label="This month so far" calls={s.month_to_date_calls} price={price}
          sub={s.month_error_calls > 0 ? `${s.month_error_calls} failed` : undefined} />
        <Tile label="Projected this month" calls={s.projected_month_calls} price={price} warn={overBudget} />
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Monthly budget</p>
          <p className="mt-1 font-jetbrains text-2xl font-semibold text-white">{budget === null ? '—' : inr(budget)}</p>
          <p className={`mt-0.5 text-xs ${overBudget ? 'text-rose-300' : 'text-slate-400'}`}>
            {budget !== null && projectedCost !== null ? `${Math.round((projectedCost / budget) * 100)}% projected` : 'Set below'}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="flex h-28 items-end gap-[3px]" role="img"
          aria-label={`Daily AI calls for the last ${s.by_day.length} days; busiest day ${busiest}`}>
          {s.by_day.map((d) => {
            const dayTotal = total(d);
            const title = `${d.day}: ` + SERIES.map((x) => `${count(d, x.key)} ${x.short}`).join(', ');
            return (
              <div key={d.day} className="group relative flex h-full flex-1 flex-col-reverse" title={title}>
                {dayTotal === 0 && <div className="bg-slate-700" style={{ height: 1 }} />}
                {SERIES.map((x) => {
                  const n = count(d, x.key);
                  return n > 0 && (
                    <div key={x.key} className={`${x.color} transition-opacity group-hover:opacity-90 last:rounded-t-sm`}
                      style={{ height: `${(n / busiest) * 100}%` }} />
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500">
          <span>{s.by_day[0]?.day}</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {SERIES.map((x) => (
              <span key={x.key}><span className={`mr-1.5 inline-block h-2 w-2 rounded-sm ${x.color}`} />{x.label}</span>
            ))}
          </span>
          <span>{s.today}</span>
        </div>
      </div>
    </section>
  );
}
