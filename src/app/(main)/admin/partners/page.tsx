'use client';

import React, { useState } from 'react';
import { Copy, KeyRound, Link2, XCircle } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useApiQuery } from '@/hooks/useApiQuery';
import { LoadingScreen } from '@/components/LoadingScreen';
import { authFetch } from '@/lib/authFetch';

interface Tenant { tenant_id: string; name: string; kind: string; institutions: { status: string }[] }
interface Link { tenant_id: string; partner_id: string; enabled: boolean; agreement_ref: string | null }
interface Key { id: string; partner_id: string; key_prefix: string; label: string | null; created_at: string; last_used_at: string | null; revoked_at: string | null }

const btn = 'bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 text-slate-950 font-bold font-mono text-[11px] uppercase tracking-widest py-2 px-3 rounded';
const ghost = 'border border-cyan-800 text-cyan-300 hover:bg-cyan-950/40 font-mono text-[11px] uppercase tracking-widest py-2 px-3 rounded disabled:opacity-40';
const PARTNER = 'eklav';

async function errorText(res: Response) {
  try { const j = await res.json(); return typeof j.detail === 'string' ? j.detail : `Request failed (${res.status})`; }
  catch { return `Request failed (${res.status})`; }
}

export default function PartnersAdminPage() {
  const { loading: authLoading } = useRequireAuth({ allowedRoles: ['admin'] });
  const overview = useApiQuery<{ tenants: Tenant[] }>(authLoading ? null : '/api/tenancy/overview');
  const partners = useApiQuery<{ links: Link[]; keys: Key[] }>(authLoading ? null : '/api/tenancy/partners');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string; secret?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (authLoading || overview.loading || partners.loading) return <LoadingScreen />;

  const call = async (url: string, body?: unknown) => {
    setBusy(true); setMsg(null);
    try {
      const res = await authFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) { setMsg({ kind: 'err', text: await errorText(res) }); return null; }
      return await res.json();
    } finally { setBusy(false); }
  };

  const linkFor = (t: Tenant) => partners.data?.links.find((l) => l.tenant_id === t.tenant_id && l.partner_id === PARTNER);

  const toggle = async (t: Tenant) => {
    const on = linkFor(t)?.enabled;
    if (on) {
      if (!window.confirm(`Stop sharing ${t.name} with eklav? The event feed and student details stop immediately.`)) return;
      if (await call(`/api/tenancy/tenants/${t.tenant_id}/partners/${PARTNER}`, { enabled: false })) {
        setMsg({ kind: 'ok', text: `eklav switched off for ${t.name}.` }); partners.refetch();
      }
      return;
    }
    const ref = window.prompt(`Agreement covering eklav for ${t.name} (e.g. "MSA-2026-07 + eklav addendum"):`, linkFor(t)?.agreement_ref ?? '');
    if (!ref || ref.trim().length < 3) return;
    if (await call(`/api/tenancy/tenants/${t.tenant_id}/partners/${PARTNER}`, { enabled: true, agreement_ref: ref.trim() })) {
      setMsg({ kind: 'ok', text: `eklav switched on for ${t.name}. Students still decide individually (Data sharing).` }); partners.refetch();
    }
  };

  const createKey = async () => {
    const label = window.prompt('Label for this key (e.g. "eklav production")');
    if (!label || label.trim().length < 3) return;
    const out = await call(`/api/tenancy/partners/${PARTNER}/keys`, { label: label.trim() });
    if (out) {
      setMsg({ kind: 'ok', text: 'Key created. Copy it now and give it to eklav through a secure channel; it is not shown again.', secret: out.key });
      partners.refetch();
    }
  };

  const revoke = async (k: Key) => {
    if (!window.confirm(`Revoke key ${k.key_prefix} (${k.label})? eklav calls with it fail immediately.`)) return;
    if (await call(`/api/tenancy/partners/${PARTNER}/keys/${k.id}/revoke`)) { setMsg({ kind: 'ok', text: 'Key revoked.' }); partners.refetch(); }
  };

  const tenants = (overview.data?.tenants ?? []).filter((t) => t.kind !== 'test');
  const keys = (partners.data?.keys ?? []).filter((k) => k.partner_id === PARTNER);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8 font-mono">
      <header className="space-y-1">
        <h1 className="flex items-center gap-3 text-3xl font-black uppercase tracking-tight text-white"><Link2 className="w-7 h-7 text-cyan-400" /> Partners: eklav</h1>
        <p className="text-xs text-white/50">
          eklav only sees tenants switched on here, and only the details of students who turned on sharing themselves. Contract: docs/integrations/eklav/EVENTS.md and API.md.
        </p>
      </header>

      {msg && (
        <div className={`rounded-lg p-4 text-xs space-y-2 border ${msg.kind === 'ok' ? 'border-cyan-800/50 bg-cyan-950/20 text-cyan-200' : 'border-rose-800/50 bg-rose-950/20 text-rose-300'}`}>
          <p>{msg.text}</p>
          {msg.secret && (
            <div className="flex gap-2">
              <input readOnly value={msg.secret} onFocus={(e) => e.currentTarget.select()} className="flex-1 bg-slate-950 border border-cyan-900/40 rounded px-3 py-2 text-[11px] text-white" />
              <button className={ghost} onClick={() => navigator.clipboard?.writeText(msg.secret!)}><Copy className="w-3.5 h-3.5 inline" /> Copy</button>
            </div>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Tenants</h2>
        {tenants.map((t) => {
          const l = linkFor(t);
          return (
            <div key={t.tenant_id} className="flex flex-wrap items-center justify-between gap-3 border border-cyan-900/30 rounded-lg px-4 py-3 text-xs">
              <span className="text-white">{t.name} <span className="text-white/40">· {t.kind.replace('_', ' ')} · {t.institutions.filter((i) => i.status === 'active').length} active colleges{l?.agreement_ref ? ` · ${l.agreement_ref}` : ''}</span></span>
              <button className={l?.enabled ? ghost : btn} disabled={busy} onClick={() => toggle(t)}>eklav {l?.enabled ? 'on' : 'off'}</button>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><KeyRound className="w-4 h-4 text-cyan-400" /> API keys</h2>
          <button className={btn} disabled={busy} onClick={createKey}>New key</button>
        </div>
        {keys.length === 0 && <p className="text-xs text-white/40">No keys yet.</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/80 border border-white/10 rounded px-4 py-2">
            <span>{k.label} · <code>c2c_eklav_{k.key_prefix}_…</code> · created {new Date(k.created_at).toLocaleDateString()} · {k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleString()}` : 'never used'}</span>
            {k.revoked_at ? <span className="text-rose-300/80">revoked</span> : <button className={ghost} disabled={busy} onClick={() => revoke(k)}><XCircle className="w-3.5 h-3.5 inline" /> Revoke</button>}
          </div>
        ))}
      </section>
    </div>
  );
}
