'use client';

import React, { useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import type { AiCostLimits, AiSpendSummary } from '@/types/costs';

/** Every AI limit in one place, plus the admin-entered price and budget. Enforced in the database. */

type Field = { key: keyof AiCostLimits; label: string; hint: string; integer: boolean };

const FIELDS: Field[] = [
  { key: 'account_max_calls_per_day', label: 'Account limit per day', hint: 'All AI calls, TypeSafe and Gemini. Empty = no limit.', integer: true },
  { key: 'featurize_max_calls_per_day', label: 'Profile features per day', hint: 'Talent Pool and employer views. 0 switches it off.', integer: true },
  { key: 'evaluate_max_calls_per_day', label: 'Assessment evaluations per day', hint: '0 switches it off.', integer: true },
  { key: 'match_max_calls_per_day', label: 'Job matches per day', hint: 'One call per shortlisted candidate. 0 ranks on 5Q only.', integer: true },
  { key: 'gemini_scout_max_calls_per_day', label: 'Market scout (Gemini) per day', hint: 'One call per 5 jobs, every 6 h. 0 stores jobs unscored.', integer: true },
  { key: 'gemini_item_gen_max_calls_per_day', label: 'Item generator (Gemini) per day', hint: 'Admin question generation. 0 uses template items.', integer: true },
  { key: 'price_per_call_inr', label: 'Price per call (₹)', hint: 'Average across TypeSafe and Gemini. Display only.', integer: false },
  { key: 'monthly_budget_inr', label: 'Monthly budget (₹)', hint: 'Display and advice only.', integer: false },
];

const toText = (v: number | null) => (v === null || v === undefined ? '' : String(v));

export default function CostLimitsForm({ s, onSaved }: { s: AiSpendSummary; onSaved: () => void }) {
  const [values, setValues] = useState<Record<keyof AiCostLimits, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, toText(s[f.key])])) as Record<keyof AiCostLimits, string>,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const parse = (f: Field, raw: string): number | null | 'invalid' => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || (f.integer && !Number.isInteger(n))) return 'invalid';
    return n;
  };
  const invalid = FIELDS.filter((f) => parse(f, values[f.key]) === 'invalid').map((f) => f.key);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (invalid.length) return;
    setSaving(true);
    setMessage(null);
    try {
      const body = Object.fromEntries(FIELDS.map((f) => [f.key, parse(f, values[f.key])]));
      const res = await authFetch('/api/costs/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => null))?.detail;
        setMessage({ ok: false, text: typeof detail === 'string' ? detail : 'Could not save limits.' });
        return;
      }
      setMessage({ ok: true, text: 'Limits saved. They apply to the next call.' });
      onSaved();
    } catch {
      setMessage({ ok: false, text: 'Could not reach the server. Limits were not changed.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="limits-heading" className="rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 id="limits-heading" className="font-medium text-white">Limits</h2>
        <p className="text-xs text-slate-500">
          The database refuses a call over a limit before it is paid for; the page then shows a heuristic estimate.
          {s.suggested_account_cap !== null && (
            <> To stay in budget, set the account limit to <strong className="text-blue-300">{s.suggested_account_cap}</strong> calls a day.</>
          )}
        </p>
      </div>

      <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => {
          const bad = invalid.includes(f.key);
          return (
            <label key={f.key} className="block">
              <span className="text-sm text-slate-300">{f.label}</span>
              <input
                inputMode={f.integer ? 'numeric' : 'decimal'}
                value={values[f.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                aria-invalid={bad}
                className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 font-jetbrains text-white outline-none transition focus:ring-2 ${
                  bad ? 'border-rose-500 focus:ring-rose-500/40' : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/30'
                }`}
              />
              <span className={`mt-1 block text-xs ${bad ? 'text-rose-400' : 'text-slate-500'}`}>
                {bad ? `Enter a ${f.integer ? 'whole ' : ''}number of 0 or more, or leave empty.` : f.hint}
              </span>
            </label>
          );
        })}

        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={saving || invalid.length > 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save limits'}
          </button>
          {message && (
            <p role="status" className={`text-sm ${message.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{message.text}</p>
          )}
        </div>
      </form>
    </section>
  );
}
