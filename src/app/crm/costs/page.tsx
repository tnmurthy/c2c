'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Gauge, AlertTriangle, Lightbulb } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { useAuthSession } from '@/hooks/useAuthSession';
import DataState from '@/components/ui/DataState';
import SpendSummary from '@/components/costs/SpendSummary';
import CostLimitsForm from '@/components/costs/CostLimitsForm';
import type { AiSpendSummary } from '@/types/costs';

/**
 * Costs: what TypeSafe is spending, every limit on it, and what to change.
 * Admin only. Hosting is billed and capped in each vendor's own dashboard.
 */

const COST_ROLES = ['admin', 'tenant_admin'];

const SAVINGS_BUILT_IN = [
  'A candidate profile is sent to TypeSafe once, then reused until the profile text changes.',
  'An empty profile is never sent; it gets a free heuristic estimate.',
  'A page with many new candidates sends at most 25 at a time; the rest fill in on later visits.',
  'Each profile is judged with all seven questions in a single call.',
  'Failed calls are not retried in a loop; the page shows a labelled estimate instead.',
];

const VENDOR_CAPS = [
  { name: 'Vercel', where: 'Team settings → Billing → Spend Management', why: 'Caps hosting, bandwidth and function usage.' },
  { name: 'Supabase', where: 'Organization → Billing → Spend cap', why: 'Stops usage-based database charges.' },
  { name: 'Railway', where: 'Workspace → Usage → Usage limits', why: 'Caps the backend service if it runs there.' },
  { name: 'TypeSafe', where: 'Your TypeSafe account', why: 'The price per call to enter in Limits.' },
];

export default function CostsPage() {
  const { role, loading: authLoading } = useAuthSession();
  const [summary, setSummary] = useState<AiSpendSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/costs/summary');
      if (!res.ok) {
        const detail = (await res.json().catch(() => null))?.detail;
        setError(typeof detail === 'string' ? detail : `Could not load costs (${res.status}).`);
        return;
      }
      setSummary(await res.json());
      setError(null);
    } catch {
      setError('Could not reach the server.');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && role && COST_ROLES.includes(role)) void load();
  }, [authLoading, role, load]);

  if (authLoading) return <DataState state="loading" message="Checking access" />;
  if (!role || !COST_ROLES.includes(role)) {
    return <DataState state="error" message="The Costs page is available to account admins only." />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white">
          <Gauge className="h-6 w-6 text-blue-400" aria-hidden="true" /> Costs
        </h1>
        <p className="mt-1 text-sm text-slate-400">AI spend, the limits on it, and what to change to spend less.</p>
      </header>

      {error && <DataState state="error" message={error} className="rounded-2xl border border-rose-900/50 bg-rose-950/20" />}
      {!summary && !error && <DataState state="loading" message="Loading costs" />}

      {summary && (
        <>
          <SpendSummary s={summary} />
          <CostLimitsForm key={summary.settings_updated_at} s={summary} onSaved={() => void load()} />

          <section aria-labelledby="advice-heading" className="rounded-2xl border border-slate-800 bg-slate-900/40">
            <div className="flex items-baseline justify-between border-b border-slate-800 px-5 py-4">
              <h2 id="advice-heading" className="font-medium text-white">Ways to spend less</h2>
              <span className="text-xs text-slate-500">From this account&apos;s own usage</span>
            </div>
            {summary.advice.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">Nothing to change: every limit is set and spend is within budget.</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {summary.advice.map((a) => (
                  <li key={a.id} className="flex gap-3 px-5 py-3.5">
                    {a.level === 'act'
                      ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-label="Act" />
                      : <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-label="Consider" />}
                    <div>
                      <p className="text-sm font-medium text-slate-100">{a.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{a.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="savings-heading" className="rounded-2xl border border-slate-800 bg-slate-900/40">
              <h2 id="savings-heading" className="border-b border-slate-800 px-5 py-4 font-medium text-white">Savings already built in</h2>
              <ul className="list-disc space-y-1.5 py-4 pl-10 pr-5 text-sm text-slate-300">
                {SAVINGS_BUILT_IN.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </section>
            <section aria-labelledby="vendor-heading" className="rounded-2xl border border-slate-800 bg-slate-900/40">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 id="vendor-heading" className="font-medium text-white">Caps to set with each vendor</h2>
                <p className="text-xs text-slate-500">Hosting is billed outside this app</p>
              </div>
              <ul className="divide-y divide-slate-800">
                {VENDOR_CAPS.map((v) => (
                  <li key={v.name} className="px-5 py-2.5 text-sm">
                    <span className="font-medium text-slate-100">{v.name}</span>
                    <span className="text-slate-400">: {v.where}. {v.why}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
