'use client';

import React, { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Copy, Mail, ShieldCheck, XCircle } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useApiQuery } from '@/hooks/useApiQuery';
import { LoadingScreen } from '@/components/LoadingScreen';
import { authFetch } from '@/lib/authFetch';

interface Institution {
  id: number;
  name: string;
  domain: string | null;
  status: 'prospect' | 'active' | 'suspended';
  tenant_id: string;
  affiliating_university: string | null;
  agreement_ref: string | null;
  activated_at: string | null;
  roster_import_enabled: boolean;
  roster_dpa_ref: string | null;
}
interface Tenant { tenant_id: string; name: string; kind: string; status: string; institutions: Institution[] }
interface Staff {
  id: string; role: string; institution_id: number | null; tenant_id: string;
  source: string; email: string | null; verified_at: string | null;
}
interface Overview { tenants: Tenant[]; staff: Staff[] }
interface Invite {
  id: string; email: string; role: string; institution_id: number | null;
  state: 'open' | 'accepted' | 'revoked' | 'expired'; expires_at: string; created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  tenant_admin: 'Group admin', tpo: 'TPO', dept_coordinator: 'Dept coordinator', faculty_mentor: 'Faculty mentor',
};

async function errorText(res: Response) {
  try {
    const j = await res.json();
    return typeof j.detail === 'string' ? j.detail : `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

const input = 'bg-slate-950 border border-cyan-900/40 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono';
const btn = 'bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 text-slate-950 font-bold font-mono text-[11px] uppercase tracking-widest py-2 px-3 rounded';
const ghost = 'border border-cyan-800 text-cyan-300 hover:bg-cyan-950/40 font-mono text-[11px] uppercase tracking-widest py-2 px-3 rounded';

export default function TenancyAdminPage() {
  const { loading: authLoading } = useRequireAuth({ allowedRoles: ['admin'] });
  const overview = useApiQuery<Overview>(authLoading ? null : '/api/tenancy/overview');
  const invites = useApiQuery<Invite[]>(authLoading ? null : '/api/tenancy/invites');
  const [filter, setFilter] = useState<'all' | 'active' | 'prospect'>('all');
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string; link?: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const instById = useMemo(() => {
    const m = new Map<number, Institution>();
    overview.data?.tenants.forEach((t) => t.institutions.forEach((i) => m.set(i.id, i)));
    return m;
  }, [overview.data]);

  if (authLoading || overview.loading) return <LoadingScreen />;

  const post = async (key: string, url: string, body?: unknown) => {
    setBusy(key);
    setMessage(null);
    try {
      const res = await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        setMessage({ kind: 'err', text: await errorText(res) });
        return null;
      }
      return await res.json();
    } finally {
      setBusy(null);
    }
  };

  const activate = async (inst: Institution) => {
    const ref = window.prompt(`Agreement reference (LoI / MSA) for ${inst.name}:`, inst.agreement_ref ?? '');
    if (!ref || ref.trim().length < 3) return;
    if (await post(`act-${inst.id}`, `/api/tenancy/institutions/${inst.id}/activate`, { agreement_ref: ref.trim() })) {
      setMessage({ kind: 'ok', text: `${inst.name} is active (agreement ${ref.trim()}).` });
      overview.refetch();
    }
  };

  const inviteTpo = async (inst: Institution, email: string) => {
    const out = await post(`inv-${inst.id}`, '/api/tenancy/invites', { email, role: 'tpo', institution_id: inst.id });
    if (out) {
      setMessage({
        kind: 'ok',
        text: out.emailed
          ? `Invite emailed to ${out.email}. You can also share this link (shown once):`
          : `Email isn't configured, so send this link to ${out.email} yourself. It is shown only once and expires in 72 hours:`,
        link: out.accept_url,
      });
      invites.refetch();
    }
  };

  const revoke = async (inv: Invite) => {
    if (!window.confirm(`Revoke the invite for ${inv.email}?`)) return;
    if (await post(`rev-${inv.id}`, `/api/tenancy/invites/${inv.id}/revoke`)) {
      setMessage({ kind: 'ok', text: `Invite for ${inv.email} revoked.` });
      invites.refetch();
    }
  };

  const verify = async (s: Staff) => {
    if (!window.confirm(`Mark ${s.email ?? 'this TPO'} as verified? Do this only after confirming them with the college (ADR-002 SOP).`)) return;
    if (await post(`ver-${s.id}`, `/api/tenancy/memberships/${s.id}/verify`)) {
      setMessage({ kind: 'ok', text: `${s.email ?? 'Membership'} verified.` });
      overview.refetch();
    }
  };

  const toggleRoster = async (inst: Institution) => {
    if (inst.roster_import_enabled) {
      if (!window.confirm(`Switch off roster import for ${inst.name}?`)) return;
      if (await post(`ros-${inst.id}`, `/api/tenancy/institutions/${inst.id}/roster-access`, { enabled: false })) {
        setMessage({ kind: 'ok', text: `Roster import switched off for ${inst.name}.` });
        overview.refetch();
      }
      return;
    }
    const ref = window.prompt(`Agreement clause that covers student data for ${inst.name} (e.g. "MSA-2026-07 cl. 9"):`, inst.roster_dpa_ref ?? '');
    if (!ref || ref.trim().length < 3) return;
    if (await post(`ros-${inst.id}`, `/api/tenancy/institutions/${inst.id}/roster-access`, { enabled: true, dpa_ref: ref.trim() })) {
      setMessage({ kind: 'ok', text: `Roster import switched on for ${inst.name} (${ref.trim()}).` });
      overview.refetch();
    }
  };

  const tenants = overview.data?.tenants ?? [];
  const unverified = (overview.data?.staff ?? []).filter((s) => !s.verified_at);
  const openInvites = (invites.data ?? []).filter((i) => i.state === 'open');

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 font-mono">
      <header className="space-y-1">
        <h1 className="flex items-center gap-3 text-3xl font-black uppercase tracking-tight text-white">
          <Building2 className="w-7 h-7 text-cyan-400" /> Colleges &amp; staff
        </h1>
        <p className="text-xs text-white/50">
          <a href="/admin/partners" className="text-cyan-400 hover:text-cyan-300 mr-2">Partners (eklav) &rarr;</a>
          Activate a college once its LoI / MSA is signed, then invite its TPO. Invites go to an official college address, work once and expire in 72 hours.
        </p>
      </header>

      {message && (
        <div className={`rounded-lg p-4 text-xs space-y-2 border ${message.kind === 'ok' ? 'border-cyan-800/50 bg-cyan-950/20 text-cyan-200' : 'border-rose-800/50 bg-rose-950/20 text-rose-300'}`}>
          <p>{message.text}</p>
          {message.link && (
            <div className="flex gap-2 items-center">
              <input readOnly value={message.link} className={`${input} flex-1 text-[11px]`} onFocus={(e) => e.currentTarget.select()} />
              <button className={ghost} onClick={() => navigator.clipboard?.writeText(message.link!)}>
                <Copy className="w-3.5 h-3.5 inline" /> Copy
              </button>
            </div>
          )}
        </div>
      )}

      {unverified.length > 0 && (
        <section className="border border-amber-800/40 bg-amber-950/10 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-widest">Unverified staff ({unverified.length})</h2>
          <p className="text-[11px] text-white/50">Older TPO accounts that were never verified. Confirm each one with the college before verifying, or invite the right person instead.</p>
          {unverified.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/80 border-t border-white/5 pt-3">
              <span>
                {s.email ?? 'unknown email'} · {ROLE_LABEL[s.role] ?? s.role} · {s.institution_id ? instById.get(s.institution_id)?.name ?? `college ${s.institution_id}` : 'whole group'} · {s.source}
              </span>
              <button className={ghost} disabled={busy === `ver-${s.id}`} onClick={() => verify(s)}>
                <ShieldCheck className="w-3.5 h-3.5 inline" /> Verify
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Colleges</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className={input}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="prospect">Prospects</option>
          </select>
        </div>
        {tenants.filter((t) => t.kind !== 'test').map((t) => {
          const list = t.institutions.filter((i) => filter === 'all' || i.status === filter);
          if (!list.length) return null;
          return (
            <div key={t.tenant_id} className="border border-cyan-900/30 rounded-xl overflow-hidden">
              <div className="bg-slate-900/60 px-4 py-2 text-[11px] uppercase tracking-widest text-cyan-400/80">
                {t.name} <span className="text-white/30">· {t.kind.replace('_', ' ')}</span>
              </div>
              {list.map((i) => (
                <CollegeRow key={i.id} inst={i} busy={busy} onActivate={activate} onInvite={inviteTpo} onRoster={toggleRoster} />
              ))}
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Open invites ({openInvites.length})</h2>
        {openInvites.length === 0 && <p className="text-xs text-white/40">No open invites.</p>}
        {openInvites.map((inv) => (
          <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/80 border border-cyan-900/20 rounded-lg px-4 py-3">
            <span>
              <Mail className="w-3.5 h-3.5 inline text-cyan-400" /> {inv.email} · {ROLE_LABEL[inv.role] ?? inv.role}
              {inv.institution_id ? ` · ${instById.get(inv.institution_id)?.name ?? inv.institution_id}` : ''} · expires {new Date(inv.expires_at).toLocaleString()}
            </span>
            <button className={ghost} disabled={busy === `rev-${inv.id}`} onClick={() => revoke(inv)}>
              <XCircle className="w-3.5 h-3.5 inline" /> Revoke
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

function CollegeRow({ inst, busy, onActivate, onInvite, onRoster }: {
  inst: Institution;
  busy: string | null;
  onActivate: (i: Institution) => void;
  onInvite: (i: Institution, email: string) => void;
  onRoster: (i: Institution) => void;
}) {
  const [email, setEmail] = useState('');
  const active = inst.status === 'active';
  return (
    <div className="px-4 py-3 border-t border-white/5 flex flex-wrap items-center gap-3 justify-between">
      <div className="space-y-0.5">
        <div className="text-sm text-white font-bold">{inst.name}</div>
        <div className="text-[11px] text-white/40">
          {inst.domain ?? 'no domain'}
          {inst.affiliating_university ? ` · ${inst.affiliating_university}` : ''}
          {inst.agreement_ref ? ` · agreement ${inst.agreement_ref}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${active ? 'bg-emerald-950/50 text-emerald-300' : inst.status === 'prospect' ? 'bg-slate-800 text-white/60' : 'bg-rose-950/40 text-rose-300'}`}>
          {active && <CheckCircle2 className="w-3 h-3 inline mr-1" />}{inst.status}
        </span>
        {active && (
          <button className={ghost} disabled={busy === `ros-${inst.id}`} onClick={() => onRoster(inst)}
            title={inst.roster_dpa_ref ? `Agreement: ${inst.roster_dpa_ref}` : 'Switch on once the agreement covers student data'}>
            Roster {inst.roster_import_enabled ? 'on' : 'off'}
          </button>
        )}
        {!active && (
          <button className={btn} disabled={busy === `act-${inst.id}`} onClick={() => onActivate(inst)}>Activate</button>
        )}
        {active && (
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); if (email.trim()) onInvite(inst, email.trim()); }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`tpo@${inst.domain ?? 'college.ac.in'}`}
              className={`${input} w-60`}
            />
            <button className={btn} disabled={busy === `inv-${inst.id}`} type="submit">Invite TPO</button>
          </form>
        )}
      </div>
    </div>
  );
}
