import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { MatchStatus, RankedCandidate } from '@/types/matching';

/** Short names for the five TypeSafe requirement levels (0-4). */
const LEVEL_LABELS = ['No sign', 'Mentioned', 'Coursework', 'Hands-on', 'Deep'];
const LEVEL_STYLES = [
  'border-white/10 bg-white/[0.03] text-white/40',
  'border-cyan-900/60 bg-cyan-950/30 text-cyan-200/60',
  'border-cyan-700/50 bg-cyan-900/30 text-cyan-200/80',
  'border-cyan-500/60 bg-cyan-500/15 text-cyan-100',
  'border-cyan-300/70 bg-cyan-400/25 text-white',
];

const STATUS_ACTIONS: { status: MatchStatus; label: string; active: string }[] = [
  { status: 'SHORTLISTED', label: 'Shortlist', active: 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200' },
  { status: 'CONTACTED', label: 'Contacted', active: 'bg-sky-500/20 border-sky-400/60 text-sky-200' },
  { status: 'REJECTED', label: 'Reject', active: 'bg-rose-500/15 border-rose-400/50 text-rose-200' },
];

function Bar({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] font-mono uppercase tracking-wider text-[#bbc9cd]">
        <span>{label}</span>
        <span className="text-white tabular-nums">{value === null ? '—' : Math.round(value)}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-white/5">
        {value !== null && <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${Math.min(100, value)}%` }} />}
      </div>
      {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

interface Props {
  candidate: RankedCandidate;
  requirements: string[];
  saving: boolean;
  onStatus: (studentId: string, status: MatchStatus) => void;
}

export default function RankedCandidateCard({ candidate: c, requirements, saving, onStatus }: Props) {
  const reqs = requirements.length ? requirements : Object.keys(c.evidence);
  const judged = c.evidence_score !== null;

  return (
    <article
      aria-label={`Rank ${c.rank}: ${c.name ?? 'Candidate'}`}
      className={`rounded-lg border bg-[#1a2122]/60 p-5 transition-colors hover:bg-[#1a2122] ${
        c.status === 'REJECTED' ? 'border-white/5 opacity-60' : 'border-white/10'
      }`}
    >
      <div className="flex flex-wrap items-start gap-4">
        <span className="font-mono text-3xl font-bold leading-none text-white/20 tabular-nums" aria-hidden="true">
          {String(c.rank).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-white">{c.name ?? 'Unnamed candidate'}</h3>
          <p className="text-xs font-mono text-cyan-400">
            {[c.department, c.graduation_year ? `Class of ${c.graduation_year}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[#bbc9cd]">Fit</p>
          <p className="font-mono text-3xl font-bold leading-none text-white tabular-nums" data-testid="fit-score">
            {Math.round(c.fit_score)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Bar label="Assessment (5Q)" value={c.five_q_score} />
        <Bar
          label="Requirement evidence"
          value={c.evidence_score}
          hint={judged ? undefined : 'Not judged; ranked on the assessment alone'}
        />
      </div>

      {judged && reqs.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Evidence per requirement">
          {reqs.map((req) => {
            const ev = c.evidence[req];
            const level = ev ? Math.max(0, Math.min(4, Math.round(ev.level))) : 0;
            return (
              <li key={req} title={ev ? `Level ${ev.level.toFixed(1)} of 4, confidence ${Math.round(ev.confidence * 100)}%` : 'Not judged'}
                className={`rounded border px-2 py-1 text-xs ${LEVEL_STYLES[level]}`}>
                <span className="font-semibold">{req}</span>
                <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider opacity-80">{LEVEL_LABELS[level]}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Decision">
          {STATUS_ACTIONS.map((a) => {
            const isActive = c.status === a.status;
            return (
              <button
                key={a.status}
                type="button"
                disabled={saving}
                aria-pressed={isActive}
                onClick={() => onStatus(c.student_id, isActive ? 'PENDING' : a.status)}
                className={`rounded border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:cursor-wait disabled:opacity-50 ${
                  isActive ? a.active : 'border-white/10 text-white/60 hover:border-white/25 hover:text-white'
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
        <Link
          href={`/portfolio/${c.student_id}`}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
        >
          Portfolio <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
