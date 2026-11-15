'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Copy, GitMerge, Layers, Mail, Plus, UserPlus, XCircle } from 'lucide-react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { LoadingScreen } from '@/components/LoadingScreen';
import { authFetch } from '@/lib/authFetch';

interface Me {
  institution: { id: number; name: string; status: string; domain: string | null } | null;
  scope: 'college' | 'departments';
  can_manage: boolean;
  can_invite: boolean;
}
interface Dept {
  id: string; name: string; short_code: string | null; discipline_code: string | null;
  discipline_name: string | null; students: number; needs_mapping: boolean;
}
interface Discipline { code: string; name: string; level: string }
interface Queue {
  groups: { alias_norm: string; students: number; examples: string[] }[];
  blank: number;
  unmapped_departments: { id: string; name: string }[];
}
interface Invite { id: string; email: string; role: string; department_id: string | null; state: string; expires_at: string }

const ROLE_LABEL: Record<string, string> = { dept_coordinator: 'Department coordinator', faculty_mentor: 'Faculty mentor', tpo: 'TPO', tenant_admin: 'Group admin' };
const input = 'bg-[#0e1416] border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#8aebff] font-mono';
const btn = 'bg-[#8aebff] text-[#00363e] text-[11px] font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded hover:brightness-110 disabled:opacity-40';
const ghost = 'border border-[#8aebff]/40 text-[#8aebff] text-[11px] font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded hover:bg-[#8aebff]/10 disabled:opacity-40';

async function errorText(res: Response) {
  try { const j = await res.json(); return typeof j.detail === 'string' ? j.detail : `Request failed (${res.status})`; }
  catch { return `Request failed (${res.status})`; }
}

export default function DepartmentsPage() {
  const { id } = useParams<{ id: string }>();
  const me = useApiQuery<Me>(`/api/tenancy/institutions/${id}/me`);
  const depts = useApiQuery<Dept[]>(`/api/tenancy/institutions/${id}/departments/summary`);
  const disciplines = useApiQuery<Discipline[]>('/api/tenancy/disciplines');
  const college = me.data?.scope === 'college';
  const queue = useApiQuery<Queue>(college ? `/api/tenancy/institutions/${id}/review-queue` : null);
  const invites = useApiQuery<Invite[]>(college ? `/api/tenancy/invites?institution_id=${id}` : null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string; link?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (me.loading || depts.loading) return <LoadingScreen title="Loading departments" subtitle="" />;
  if (me.error || !me.data) return <p className="p-8 text-rose-400 font-mono text-sm">You don&apos;t have access to this college.</p>;

  const manage = me.data.can_manage;
  const list = depts.data ?? [];
  const refreshAll = () => { depts.refetch(); queue.refetch(); invites.refetch(); };

  const call = async (url: string, method: string, body?: unknown) => {
    setBusy(true); setMsg(null);
    try {
      const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) { setMsg({ kind: 'err', text: await errorText(res) }); return null; }
      return await res.json();
    } finally { setBusy(false); }
  };

  const patch = async (d: Dept, changes: Partial<Dept>) => {
    if (await call(`/api/tenancy/departments/${d.id}`, 'PATCH', changes)) { setMsg({ kind: 'ok', text: `${d.name} updated.` }); refreshAll(); }
  };

  const rename = (d: Dept) => {
    const name = window.prompt('Department name', d.name);
    if (name && name.trim() !== d.name) patch(d, { name: name.trim() });
  };

  const merge = async (d: Dept, intoId: string) => {
    const into = list.find((x) => x.id === intoId);
    if (!into || !window.confirm(`Merge "${d.name}" (${d.students} students) into "${into.name}"? Its students, cohorts and staff move to ${into.name}, and "${d.name}" is removed. This can't be undone.`)) return;
    const out = await call(`/api/tenancy/departments/${d.id}/merge`, 'POST', { into_department_id: intoId });
    if (out) { setMsg({ kind: 'ok', text: `Merged into ${into.name}: ${out.students_moved ?? 0} students moved.` }); refreshAll(); }
  };

  const create = async () => {
    const name = window.prompt('New department name (e.g. Electronics & Communication Engineering)');
    if (!name?.trim()) return null;
    const out = await call(`/api/tenancy/institutions/${id}/departments`, 'POST', { name: name.trim() });
    if (out) { setMsg({ kind: 'ok', text: `${out.name} added. Set its discipline below.` }); refreshAll(); }
    return out as Dept | null;
  };

  const assign = async (alias: string, deptId: string) => {
    let target = deptId;
    if (deptId === '__new') { const d = await create(); if (!d) return; target = d.id; }
    const out = await call(`/api/tenancy/institutions/${id}/review-queue/assign`, 'POST', { alias_norm: alias, department_id: target });
    if (out) { setMsg({ kind: 'ok', text: `${out.students_linked ?? 0} students linked. Future students who type this spelling are linked automatically.` }); refreshAll(); }
  };

  const invite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const out = await call('/api/tenancy/invites', 'POST', {
      email: String(f.get('email') || ''), role: String(f.get('role')), institution_id: Number(id), department_id: String(f.get('dept')),
    });
    if (out) {
      (e.target as HTMLFormElement).reset();
      setMsg({ kind: 'ok', text: out.emailed ? `Invite emailed to ${out.email}. Link (shown once):` : `Send this link to ${out.email}. It is shown only once and expires in 72 hours:`, link: out.accept_url });
      invites.refetch();
    }
  };

  const revoke = async (inv: Invite) => {
    if (window.confirm(`Revoke the invite for ${inv.email}?`) && await call(`/api/tenancy/invites/${inv.id}/revoke`, 'POST')) invites.refetch();
  };

  const q = queue.data;
  const openInvites = (invites.data ?? []).filter((i) => i.state === 'open' && i.department_id);
  const deptName = (did: string | null) => list.find((d) => d.id === did)?.name ?? '';

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8 font-mono">
      <header>
        <p className="text-[#8aebff] text-[12px] font-bold tracking-[0.1em] mb-2">{me.data.institution?.name}</p>
        <h1 className="text-4xl font-extrabold text-white tracking-tight font-sans">Departments &amp; staff</h1>
        {!manage && (
          <p className="mt-3 text-xs text-amber-300/90">
            {college ? 'View only: your TPO account is not verified yet. Ask c2c support to verify it.' : 'You can see your own departments.'}
          </p>
        )}
      </header>

      {msg && (
        <div className={`rounded p-4 text-xs space-y-2 border ${msg.kind === 'ok' ? 'border-[#8aebff]/30 bg-[#8aebff]/5 text-[#bfefff]' : 'border-rose-700/50 bg-rose-950/20 text-rose-300'}`}>
          <p>{msg.text}</p>
          {msg.link && (
            <div className="flex gap-2">
              <input readOnly value={msg.link} className={`${input} flex-1 text-[11px]`} onFocus={(e) => e.currentTarget.select()} />
              <button className={ghost} onClick={() => navigator.clipboard?.writeText(msg.link!)}><Copy className="w-3.5 h-3.5 inline" /> Copy</button>
            </div>
          )}
        </div>
      )}

      {college && q && (q.groups.length > 0 || q.unmapped_departments.length > 0) && (
        <section className="border border-amber-700/40 bg-amber-950/10 rounded p-5 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-300 uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4" /> Needs review
          </h2>
          {q.groups.map((g) => (
            <div key={g.alias_norm} className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-white/5 pt-3">
              <span className="text-white/80">
                <b className="text-white">{g.students}</b> student{g.students === 1 ? '' : 's'} typed “{g.examples.join('”, “')}”
              </span>
              {manage && (
                <select defaultValue="" disabled={busy} className={input} onChange={(e) => e.target.value && assign(g.alias_norm, e.target.value)}>
                  <option value="" disabled>Assign to department…</option>
                  {list.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  <option value="__new">+ New department…</option>
                </select>
              )}
            </div>
          ))}
          {q.blank > 0 && <p className="text-[11px] text-white/50">{q.blank} student{q.blank === 1 ? '' : 's'} left the department blank; they&apos;ll be linked when they update their profile or via roster import.</p>}
          {q.unmapped_departments.length > 0 && (
            <p className="text-[11px] text-white/60">Departments without a discipline: {q.unmapped_departments.map((d) => d.name).join(', ')}. Choose one in the table below so reports and partner apps can group them.</p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest"><Layers className="w-4 h-4 text-[#8aebff]" /> Departments ({list.length})</h2>
          {manage && <button className={btn} disabled={busy} onClick={create}><Plus className="w-3.5 h-3.5 inline" /> Add department</button>}
        </div>
        <div className="border border-white/10 rounded overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#1a2122] text-[#bbc9cd] uppercase tracking-widest text-[10px]">
              <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Code</th><th className="text-left p-3">Discipline</th><th className="text-right p-3">Students</th>{manage && <th className="text-left p-3">Merge into</th>}</tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className={`border-t border-white/5 ${d.needs_mapping ? 'bg-amber-950/10' : ''}`}>
                  <td className="p-3 text-white">
                    {manage ? <button className="hover:underline text-left" onClick={() => rename(d)} title="Rename">{d.name}</button> : d.name}
                  </td>
                  <td className="p-3">
                    {manage ? (
                      <input defaultValue={d.short_code ?? ''} placeholder="—" className={`${input} w-24`}
                        onBlur={(e) => { const v = e.target.value.trim().toUpperCase(); if (v !== (d.short_code ?? '')) patch(d, { short_code: v }); }} />
                    ) : d.short_code ?? '—'}
                  </td>
                  <td className="p-3">
                    {manage ? (
                      <select value={d.discipline_code ?? ''} disabled={busy} className={input}
                        onChange={(e) => patch(d, { discipline_code: e.target.value })}>
                        <option value="">Not set</option>
                        {(disciplines.data ?? []).map((x) => <option key={x.code} value={x.code}>{x.code} · {x.name}</option>)}
                      </select>
                    ) : d.discipline_name ?? 'Not set'}
                  </td>
                  <td className="p-3 text-right text-white">{d.students}</td>
                  {manage && (
                    <td className="p-3">
                      <select defaultValue="" disabled={busy || list.length < 2} className={input} onChange={(e) => { const v = e.target.value; e.target.value = ''; if (v) merge(d, v); }}>
                        <option value="">—</option>
                        {list.filter((x) => x.id !== d.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {manage && <p className="text-[10px] text-white/40"><GitMerge className="w-3 h-3 inline" /> Merging moves students, cohorts and staff, and remembers the old name so future sign-ups land in the right place.</p>}
      </section>

      {college && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-widest"><UserPlus className="w-4 h-4 text-[#8aebff]" /> Department staff</h2>
          {me.data.can_invite ? (
            <form onSubmit={invite} className="flex flex-wrap gap-2 items-center">
              <input name="email" type="email" required placeholder={`hod@${me.data.institution?.domain ?? 'college.ac.in'}`} className={`${input} w-64`} />
              <select name="role" className={input} defaultValue="dept_coordinator">
                <option value="dept_coordinator">Department coordinator</option>
                <option value="faculty_mentor">Faculty mentor</option>
              </select>
              <select name="dept" required className={input} defaultValue="">
                <option value="" disabled>Department…</option>
                {list.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button className={btn} disabled={busy} type="submit"><Mail className="w-3.5 h-3.5 inline" /> Invite</button>
            </form>
          ) : (
            <p className="text-xs text-white/50">{manage ? 'Invites open once c2c has activated your college.' : 'Only the verified TPO can invite department staff.'}</p>
          )}
          {openInvites.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/80 border border-white/10 rounded px-4 py-2">
              <span>{inv.email} · {ROLE_LABEL[inv.role] ?? inv.role} · {deptName(inv.department_id)} · expires {new Date(inv.expires_at).toLocaleString()}</span>
              {manage && <button className={ghost} disabled={busy} onClick={() => revoke(inv)}><XCircle className="w-3.5 h-3.5 inline" /> Revoke</button>}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
