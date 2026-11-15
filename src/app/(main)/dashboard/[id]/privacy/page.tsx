'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useApiQuery } from '@/hooks/useApiQuery';
import { LoadingScreen } from '@/components/LoadingScreen';
import { authFetch } from '@/lib/authFetch';

interface Notice {
  version: string; partner_name: string; title: string; purpose: string; data_shared: string[];
  not_shared: string[]; retention: string; voluntary: string; age: string;
}
interface Partner {
  partner_id: string; offered: boolean; sharing: boolean; needs_review: boolean; notice: Notice;
  decision: { granted: boolean; notice_version: string; created_at: string } | null;
}

export default function DataSharingPage() {
  const { id } = useParams<{ id: string }>();
  const { loading: authLoading } = useRequireAuth({ allowedRoles: ['student'] });
  const q = useApiQuery<{ partners: Partner[] }>(authLoading ? null : '/api/consent/me');

  if (authLoading || q.loading) return <LoadingScreen title="Loading" subtitle="" />;

  const partners = q.data?.partners ?? [];
  return (
    <main className="min-h-screen bg-[#0e1416] text-[#dde4e5] p-6 md:p-10 font-mono">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href={`/dashboard/${id}`} className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <header>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-cyan-400" /> Data sharing
          </h1>
          <p className="mt-2 text-sm text-white/60">
            You decide whether c2c shares your profile with other platforms your college uses. Nothing is shared unless you turn it on, and you can turn it off at any time.
          </p>
        </header>
        {q.error && <p className="text-sm text-rose-400">Couldn&apos;t load your settings. Finish your profile first, then try again.</p>}
        {!q.error && partners.length === 0 && (
          <p className="text-sm text-white/60 border border-white/10 rounded p-5">Your college doesn&apos;t use any connected platforms yet, so nothing is shared.</p>
        )}
        {partners.map((p) => <PartnerCard key={p.partner_id} p={p} onChange={q.refetch} />)}
      </div>
    </main>
  );
}

function PartnerCard({ p, onChange }: { p: Partner; onChange: () => void }) {
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = p.notice;

  const decide = async (granted: boolean) => {
    if (!granted && !window.confirm(`Stop sharing with ${n.partner_name}? It will be told to delete the data it received.`)) return;
    setBusy(true); setError(null);
    try {
      const res = await authFetch(`/api/consent/${p.partner_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(granted ? { granted, notice_version: n.version, age_confirmed: adult } : { granted }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j.detail === 'string' ? j.detail : `Request failed (${res.status})`);
        return;
      }
      onChange();
    } finally { setBusy(false); }
  };

  return (
    <section className="border border-white/10 rounded-lg p-6 space-y-4 bg-black/30">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold text-white">{n.title}</h2>
        <span className={`shrink-0 text-[10px] uppercase tracking-widest px-2 py-1 rounded ${p.sharing ? 'bg-emerald-950/60 text-emerald-300' : 'bg-slate-800 text-white/60'}`}>
          {p.sharing ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Sharing on</> : 'Sharing off'}
        </span>
      </div>
      <p className="text-sm text-white/70">{n.purpose}</p>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-cyan-400 mb-2">What is shared</h3>
          <ul className="list-disc list-inside space-y-1 text-white/80">{n.data_shared.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-white/40 mb-2">Never shared</h3>
          <ul className="list-disc list-inside space-y-1 text-white/50">{n.not_shared.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
      </div>
      <p className="text-xs text-white/50">{n.retention}</p>
      <p className="text-xs text-white/50">{n.voluntary}</p>
      {p.needs_review && <p className="text-xs text-amber-300">This information has changed since you agreed. Please read it again and turn sharing back on if you still want it.</p>}

      {p.sharing ? (
        <button onClick={() => decide(false)} disabled={busy}
          className="inline-flex items-center gap-2 border border-rose-500/40 text-rose-300 hover:bg-rose-950/30 text-xs uppercase tracking-widest px-4 py-2 rounded disabled:opacity-40">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Turn off sharing
        </button>
      ) : p.offered ? (
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-white/80">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1" />
            <span>I am 18 or older, I have read what is shared above, and I agree to share it with {n.partner_name}.</span>
          </label>
          <p className="text-[11px] text-white/40">{n.age}</p>
          <button onClick={() => decide(true)} disabled={busy || !adult}
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 text-slate-950 font-bold text-xs uppercase tracking-widest px-4 py-2 rounded">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Turn on sharing
          </button>
        </div>
      ) : (
        <p className="text-xs text-white/50">Your college has turned {n.partner_name} off, so nothing is shared.</p>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {p.decision && <p className="text-[10px] text-white/30">Last changed {new Date(p.decision.created_at).toLocaleString()} · notice {p.decision.notice_version}</p>}
    </section>
  );
}
