'use client';

import React, { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Trash2, Upload } from 'lucide-react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { LoadingScreen } from '@/components/LoadingScreen';
import { authFetch } from '@/lib/authFetch';

interface Me { institution: { name: string } | null; scope: string; can_manage: boolean; roster_enabled: boolean }
interface Row {
  line: number; action: 'new' | 'update' | 'error'; full_name: string; email: string; graduation_year: number | null;
  department: string; department_name: string | null; errors: string[]; warnings: string[];
}
interface Summary { rows: number; new: number; update: number; error: number; warnings: number; unresolved_department: number }
interface Preview { id: string; summary: Summary; rows: Row[]; expires_at: string }
interface PastImport {
  id: string; filename: string | null; status: string; summary: Summary; created_at: string;
  result: { created: number; updated: number; skipped_errors: number; conflicts: number } | null;
}

const btn = 'bg-[#8aebff] text-[#00363e] text-[11px] font-bold tracking-[0.1em] uppercase px-4 py-2 rounded hover:brightness-110 disabled:opacity-40 inline-flex items-center gap-2';
const ghost = 'border border-[#8aebff]/40 text-[#8aebff] text-[11px] font-bold tracking-[0.1em] uppercase px-4 py-2 rounded hover:bg-[#8aebff]/10 disabled:opacity-40 inline-flex items-center gap-2';
const SHOW = 300;

async function errorText(res: Response) {
  try { const j = await res.json(); return typeof j.detail === 'string' ? j.detail : `Request failed (${res.status})`; }
  catch { return `Request failed (${res.status})`; }
}

export default function RosterPage() {
  const { id } = useParams<{ id: string }>();
  const me = useApiQuery<Me>(`/api/tenancy/institutions/${id}/me`);
  const history = useApiQuery<PastImport[]>(me.data?.scope === 'college' ? `/api/roster/${id}/imports` : null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (me.loading) return <LoadingScreen title="Loading" subtitle="" />;
  if (me.error || !me.data) return <p className="p-8 text-rose-400 font-mono text-sm">You don&apos;t have access to this college.</p>;

  const downloadTemplate = async () => {
    const res = await authFetch('/api/roster/template');
    const blob = new Blob([await res.text()], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'c2c-roster-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    setMsg(null); setPreview(null);
    if (file.size > 2 * 1024 * 1024) { setMsg({ kind: 'err', text: 'The file is larger than 2 MB. Split it by department or year.' }); return; }
    setBusy(true);
    try {
      const res = await authFetch(`/api/roster/${id}/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, csv_text: await file.text() }),
      });
      if (!res.ok) { setMsg({ kind: 'err', text: await errorText(res) }); return; }
      setPreview(await res.json());
      setFilter('all');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const commit = async () => {
    if (!preview) return;
    const s = preview.summary;
    if (!window.confirm(`Add ${s.new} new and update ${s.update} existing students? ${s.error} row(s) with errors will be skipped.`)) return;
    setBusy(true);
    try {
      const res = await authFetch(`/api/roster/imports/${preview.id}/commit`, { method: 'POST' });
      if (!res.ok) { setMsg({ kind: 'err', text: await errorText(res) }); return; }
      const r = await res.json();
      setMsg({ kind: 'ok', text: `Done: ${r.created} added, ${r.updated} updated, ${r.skipped_errors} skipped${r.conflicts ? `, ${r.conflicts} registered at another college in the meantime (skipped)` : ''}. Students link to their record when they sign up with the same email.` });
      setPreview(null);
      history.refetch();
    } finally { setBusy(false); }
  };

  const discard = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await authFetch(`/api/roster/imports/${preview.id}/discard`, { method: 'POST' });
      setPreview(null);
      history.refetch();
    } finally { setBusy(false); }
  };

  const rows = (preview?.rows ?? []).filter((r) => filter === 'all' || (filter === 'error' ? r.action === 'error' : r.warnings.length > 0));

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8 font-mono">
      <header>
        <p className="text-[#8aebff] text-[12px] font-bold tracking-[0.1em] mb-2">{me.data.institution?.name}</p>
        <h1 className="text-4xl font-extrabold text-white tracking-tight font-sans">Roster import</h1>
        <p className="mt-2 text-xs text-white/50 max-w-3xl">
          Upload your student list as CSV. Nothing is saved until you review the check and confirm. Students don&apos;t get an email or a
          login from this; they link to their record when they sign up with the same email, and employers only see students who have signed up.
        </p>
      </header>

      {!me.data.roster_enabled ? (
        <div className="border border-white/10 rounded p-5 text-sm text-white/70">
          Roster import isn&apos;t switched on for your college yet. c2c turns it on once your agreement covers student data. Contact your c2c account manager.
        </div>
      ) : !me.data.can_manage ? (
        <div className="border border-amber-700/40 rounded p-5 text-sm text-amber-300/90">Only the college&apos;s verified TPO can import a roster.</div>
      ) : (
        <section className="flex flex-wrap gap-3 items-center">
          <button className={ghost} onClick={downloadTemplate}><Download className="w-4 h-4" /> Template</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} Upload CSV
          </button>
          <span className="text-[11px] text-white/40">Columns: name, email, department, graduation year; phone and roll number optional. Up to 5,000 students / 2 MB.</span>
        </section>
      )}

      {msg && (
        <div className={`rounded p-4 text-xs border ${msg.kind === 'ok' ? 'border-emerald-700/40 bg-emerald-950/20 text-emerald-200' : 'border-rose-700/50 bg-rose-950/20 text-rose-300'}`}>
          {msg.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 inline mr-2" /> : <AlertTriangle className="w-4 h-4 inline mr-2" />}{msg.text}
        </div>
      )}

      {preview && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[['Rows', preview.summary.rows], ['New', preview.summary.new], ['Update', preview.summary.update],
              ['Errors (skipped)', preview.summary.error], ['No department match', preview.summary.unresolved_department]].map(([k, v]) => (
              <div key={k as string} className="border border-white/10 rounded p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/40">{k}</div>
                <div className="text-2xl font-black text-white">{v}</div>
              </div>
            ))}
          </div>
          {preview.summary.unresolved_department > 0 && (
            <p className="text-[11px] text-amber-300/80">Students whose department wasn&apos;t recognised are still added; assign them in Departments &amp; Staff → Needs review.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button className={btn} disabled={busy || preview.summary.new + preview.summary.update === 0} onClick={commit}>
              <Upload className="w-4 h-4" /> Import {preview.summary.new + preview.summary.update} students
            </button>
            <button className={ghost} disabled={busy} onClick={discard}><Trash2 className="w-4 h-4" /> Discard</button>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="bg-[#0e1416] border border-white/10 rounded px-2 py-1.5 text-xs text-white">
              <option value="all">All rows</option>
              <option value="error">Errors only</option>
              <option value="warn">Warnings only</option>
            </select>
            <span className="text-[10px] text-white/40">Preview kept until {new Date(preview.expires_at).toLocaleString()}</span>
          </div>
          <div className="border border-white/10 rounded overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#1a2122] text-[#bbc9cd] uppercase tracking-widest text-[10px]">
                <tr><th className="p-2 text-left">Line</th><th className="p-2 text-left">Result</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Year</th><th className="p-2 text-left">Department</th><th className="p-2 text-left">Notes</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, SHOW).map((r) => (
                  <tr key={r.line} className={`border-t border-white/5 ${r.action === 'error' ? 'bg-rose-950/20' : ''}`}>
                    <td className="p-2 text-white/40">{r.line}</td>
                    <td className="p-2"><span className={r.action === 'error' ? 'text-rose-300' : r.action === 'update' ? 'text-[#8aebff]' : 'text-emerald-300'}>{r.action}</span></td>
                    <td className="p-2 text-white">{r.full_name}</td>
                    <td className="p-2 text-white/80">{r.email}</td>
                    <td className="p-2">{r.graduation_year ?? '—'}</td>
                    <td className="p-2">{r.department_name ?? <span className="text-amber-300/80">{r.department || '—'}</span>}</td>
                    <td className="p-2 text-white/60">{[...r.errors, ...r.warnings].join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > SHOW && <p className="text-[10px] text-white/40">Showing the first {SHOW} of {rows.length} rows. Use the filter to see errors.</p>}
        </section>
      )}

      {(history.data?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Recent imports</h2>
          {history.data!.map((h) => (
            <div key={h.id} className="text-xs text-white/70 border border-white/10 rounded px-4 py-2 flex flex-wrap justify-between gap-2">
              <span>{h.filename ?? 'roster.csv'} · {new Date(h.created_at).toLocaleString()} · {h.summary?.rows ?? 0} rows</span>
              <span className={h.status === 'committed' ? 'text-emerald-300' : 'text-white/40'}>
                {h.status}{h.result ? ` · ${h.result.created} added, ${h.result.updated} updated` : ''}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
