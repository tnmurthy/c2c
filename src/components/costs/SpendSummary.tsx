import React from 'react';
import type { AiSpendSummary } from '@/types/costs';

/** TypeSafe calls today, this month and per day for 30 days; rupees only when a price is set. */

const inr = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function Tile({ label, calls, price, sub, warn }: {
  label: string; calls: number; price: number | null; sub?: string; warn?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${warn ? 'border-rose-500/50 bg-rose-950/30' : 'border-slate-800 bg-slate-900/60'}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-jetbrains text-2xl font-semibold tabular-nums ${warn ? 'text-rose-300' : 'text-white'}`}>
        {calls.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">calls</span>
      </p>
      <p className="mt-0.5 text-xs text-slate-400">{price === null ? (sub ?? ' ') : inr(calls * price)}</p>
    </div>
  );
}

export default function SpendSummary({ s }: { s: AiSpendSummary }) {
  const price = s.price_per_call_inr === null ? null : Number(s.price_per_call_inr);
  const budget = s.monthly_budget_inr === null ? null : Number(s.monthly_budget_inr);
  const today = s.today_calls.featurize_calls + s.today_calls.evaluate_calls + (s.today_calls.match_calls ?? 0);
  const projectedCost = price === null ? null : s.projected_month_calls * price;
  const overBudget = budget !== null && projectedCost !== null && projectedCost > budget;
  const dayTotal = (d: AiSpendSummary['by_day'][number]) => d.featurize_calls + d.evaluate_calls + (d.match_calls ?? 0);
  const busiest = Math.max(1, ...s.by_day.map(dayTotal));

  return (
    <section aria-labelledby="spend-heading" className="rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 id="spend-heading" className="font-medium text-white">AI spend</h2>
        <p className="text-xs text-slate-500">TypeSafe calls. Cached profiles and heuristic estimates make no call.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 lg:grid-cols-4">
        <Tile label="Today" calls={today} price={price}
          sub={`${s.today_calls.featurize_calls} profile · ${s.today_calls.match_calls ?? 0} match · ${s.today_calls.evaluate_calls} assessment`} />
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
          aria-label={`Daily TypeSafe calls for the last ${s.by_day.length} days; busiest day ${busiest}`}>
          {s.by_day.map((d) => {
            const total = dayTotal(d);
            const match = d.match_calls ?? 0;
            return (
              <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end"
                title={`${d.day}: ${d.featurize_calls} profile, ${match} match, ${d.evaluate_calls} assessment`}>
                <div className="rounded-t-sm bg-amber-400/80" style={{ height: `${(d.evaluate_calls / busiest) * 100}%` }} />
                <div className={`bg-emerald-400/80 ${d.evaluate_calls ? '' : 'rounded-t-sm'}`} style={{ height: `${(match / busiest) * 100}%` }} />
                <div className={`bg-blue-500/80 transition-colors group-hover:bg-blue-400 ${d.evaluate_calls || match ? '' : 'rounded-t-sm'}`}
                  style={{ height: `${(d.featurize_calls / busiest) * 100}%`, minHeight: total === 0 ? 1 : undefined }} />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500">
          <span>{s.by_day[0]?.day}</span>
          <span className="flex gap-4">
            <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-blue-500/80" />Profile features</span>
            <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-emerald-400/80" />Job matching</span>
            <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-amber-400/80" />Assessment evaluation</span>
          </span>
          <span>{s.today}</span>
        </div>
      </div>
    </section>
  );
}
