"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle, Users } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';
import { authFetch } from '@/lib/authFetch';
import RankedCandidateCard from '@/components/employer/RankedCandidateCard';
import type { JobPosting, MatchRunSummary, MatchStatus, RankedCandidate } from '@/types/matching';

/** Ranked candidates for one job (P3-B): fit = 5Q assessment + TypeSafe requirement evidence. */

type Filter = 'ALL' | MatchStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Undecided' },
  { id: 'SHORTLISTED', label: 'Shortlisted' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'REJECTED', label: 'Rejected' },
];

async function errorDetail(res: Response, fallback: string): Promise<string> {
  const detail = (await res.json().catch(() => null))?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

export default function JobCandidatesPage() {
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ['employer', 'admin'] });
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [job, setJob] = useState<JobPosting | null>(null);
  const [candidates, setCandidates] = useState<RankedCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [matching, setMatching] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    try {
      const [jobRes, candRes] = await Promise.all([
        authFetch(`/api/employer/jobs/${jobId}`),
        authFetch(`/api/employer/jobs/${jobId}/candidates`),
      ]);
      if (!jobRes.ok) throw new Error(await errorDetail(jobRes, `Could not load this job (${jobRes.status}).`));
      if (!candRes.ok) throw new Error(await errorDetail(candRes, `Could not load candidates (${candRes.status}).`));
      setJob(await jobRes.json());
      setCandidates(await candRes.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the server.');
    }
  }, [jobId]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  const runMatching = async () => {
    setMatching(true);
    setNotice(null);
    try {
      const res = await authFetch(`/api/employer/jobs/${jobId}/match`, { method: 'POST' });
      if (!res.ok) throw new Error(await errorDetail(res, 'Matching failed.'));
      const s: MatchRunSummary = await res.json();
      setNotice({ ok: true, text: `Ranked ${s.ranked} of ${s.candidates} assessed students; requirement evidence judged for ${s.evidence_judged}.` });
      await load();
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Matching failed.' });
    } finally {
      setMatching(false);
    }
  };

  const setStatus = async (studentId: string, status: MatchStatus) => {
    const before = candidates;
    setSavingId(studentId);
    setNotice(null);
    setCandidates((prev) => prev?.map((c) => (c.student_id === studentId ? { ...c, status } : c)) ?? prev);
    try {
      const res = await authFetch(`/api/employer/jobs/${jobId}/candidates/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await errorDetail(res, 'Could not save the decision.'));
    } catch (e) {
      setCandidates(before);
      setNotice({ ok: false, text: `${e instanceof Error ? e.message : 'Could not save the decision.'} The change was undone.` });
    } finally {
      setSavingId(null);
    }
  };

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { ALL: 0, PENDING: 0, SHORTLISTED: 0, CONTACTED: 0, REJECTED: 0 };
    for (const c of candidates ?? []) { out.ALL += 1; out[c.status] += 1; }
    return out;
  }, [candidates]);
  const visible = (candidates ?? []).filter((c) => filter === 'ALL' || c.status === filter);
  const requirements = job?.requirements ?? [];

  if (authLoading || !user) return <LoadingScreen />;

  return (
    <main className="min-h-screen bg-[#0e1416] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/employer" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Job postings
        </Link>

        {error ? (
          <div role="alert" className="mt-8 flex items-start gap-3 rounded-lg border border-rose-900/50 bg-rose-950/20 p-5 text-rose-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm">{error}</p>
          </div>
        ) : !job || candidates === null ? (
          <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-cyan-400" aria-label="Loading" /></div>
        ) : (
          <>
            <header className="mt-6 flex flex-wrap items-end justify-between gap-6 border-b border-white/5 pb-6">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-400">Ranked candidates</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">{job.title}</h1>
                {requirements.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Requirements">
                    {requirements.map((r) => (
                      <li key={r} className="rounded border border-white/10 px-2 py-0.5 font-mono text-[11px] text-[#bbc9cd]">{r}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={runMatching}
                disabled={matching}
                className="inline-flex items-center gap-2 rounded bg-cyan-500 px-4 py-2 font-mono text-sm font-bold tracking-widest text-[#00363e] transition-colors hover:bg-cyan-400 active:bg-cyan-600 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${matching ? 'animate-spin' : ''}`} aria-hidden="true" />
                {matching ? 'MATCHING…' : 'RE-RUN_MATCHING'}
              </button>
            </header>

            <p className="mt-4 text-xs text-white/40">
              Fit is half the 5Q assessment for this role type, half the evidence in each candidate&apos;s profile for the
              requirements above. Your decisions are kept when matching is re-run.
            </p>

            {notice && (
              <p role="status" className={`mt-4 rounded border px-4 py-2 text-sm ${notice.ok ? 'border-cyan-900/60 bg-cyan-950/30 text-cyan-100' : 'border-rose-900/60 bg-rose-950/30 text-rose-200'}`}>
                {notice.text}
              </p>
            )}

            {candidates.length === 0 ? (
              <div className="mt-10 rounded-lg border border-white/5 bg-white/5 p-12 text-center">
                <Users className="mx-auto mb-4 h-10 w-10 text-white/20" aria-hidden="true" />
                <h2 className="text-lg font-bold">No ranked candidates yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#bbc9cd]">
                  Matching runs when a job is posted. Run it now to rank every student with a completed assessment.
                </p>
              </div>
            ) : (
              <>
                <nav aria-label="Filter by decision" className="mt-6 flex gap-1 overflow-x-auto">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      aria-pressed={filter === f.id}
                      className={`whitespace-nowrap rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                        filter === f.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                      }`}
                    >
                      {f.label} <span className="tabular-nums text-white/40">{counts[f.id]}</span>
                    </button>
                  ))}
                </nav>
                <div className="mt-4 space-y-3">
                  {visible.length === 0 ? (
                    <p className="py-10 text-center text-sm text-white/40">No candidates with this decision.</p>
                  ) : visible.map((c) => (
                    <RankedCandidateCard
                      key={c.student_id}
                      candidate={c}
                      requirements={requirements}
                      saving={savingId === c.student_id}
                      onStatus={setStatus}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
