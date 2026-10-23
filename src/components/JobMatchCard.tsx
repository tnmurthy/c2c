"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  MapPin, 
  Building2, 
  TrendingUp, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  Send,
  ExternalLink,
  Brain
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { InterviewPrepModal } from "@/components/InterviewPrepModal";
import { ApplicationReviewModal } from "@/components/ApplicationReviewModal";

export interface MatchDimension {
  name: string;
  score: number;
  weight: string;
  status: string;
  details: string[];
}

export interface JobMatchCardData {
  job_title: string;
  company: string;
  overall_score: number;
  grade: string;
  dimensions: MatchDimension[];
  key_strengths: string[];
  growth_gaps: string[];
  typesafe_telemetry?: {
    model_provider: string;
    numeric_vector: number[];
    feature_names: string[];
    features: Record<string, {
      mean: number;
      spread_sd: number;
      kind: 'intensity' | 'presence';
      interpretation: string;
    }>;
    is_live_api: boolean;
  };
}


interface JobMatchCardProps {
  postingText: string;
  candidateProfile: Record<string, any>;
  jobMeta?: {
    id?: string;
    title?: string;
    company?: string;
    location?: string;
    url?: string;
  };
  initialData?: JobMatchCardData | null;
  onApply?: (jobId: string) => void;
  alreadyApplied?: boolean;
}

export const JobMatchCard: React.FC<JobMatchCardProps> = ({
  postingText,
  candidateProfile,
  jobMeta,
  initialData,
  onApply,
  alreadyApplied = false,
}) => {
  const [data, setData] = useState<JobMatchCardData | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prepModalOpen, setPrepModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCardData = async () => {
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/market/job-match-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting: postingText || `${jobMeta?.title || ""} ${jobMeta?.company || ""}`,
          candidate: candidateProfile,
          job_meta: jobMeta || {},
        }),
      });
      if (!res.ok) throw new Error("Failed to load match breakdown");
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to calculate dimensions");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!expanded && !data) {
      fetchCardData();
    }
    setExpanded(!expanded);
  };

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
      case "B": return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
      case "C": return "text-amber-400 border-amber-500/30 bg-amber-500/10";
      default: return "text-rose-400 border-rose-500/30 bg-rose-500/10";
    }
  };

  const statusBadge = (status: string) => {
    if (status === "PASS" || status === "Optimal" || status === "Qualified" || status === "Strong Synergy" || status === "High Alignment") {
      return <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><CheckCircle2 className="w-2.5 h-2.5" /> {status}</span>;
    }
    if (status === "FLAG" || status === "Learnable Gap" || status === "Stretch Role" || status === "Moderate Alignment" || status === "Compatible") {
      return <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"><AlertTriangle className="w-2.5 h-2.5" /> {status}</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"><XCircle className="w-2.5 h-2.5" /> {status}</span>;
  };

  return (
    <div className="relative group/match rounded-xl bg-black/60 border border-white/10 overflow-hidden backdrop-blur-md transition-all hover:border-cyan-500/40">
      {/* Top Banner Overview */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-cyan-400/70 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
              5D_FIT_EVALUATION
            </span>
            {jobMeta?.location && (
              <span className="text-[11px] font-mono text-white/40 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {jobMeta.location}
              </span>
            )}
          </div>
          <h3 className="text-white text-lg font-bold truncate tracking-tight">
            {jobMeta?.title || data?.job_title || "Opportunity Alignment"}
          </h3>
          <p className="text-[#bbc9cd] text-xs flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3 h-3 text-white/40" /> {jobMeta?.company || data?.company || "Confidential Org"}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Grade & Score Badge */}
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-lg border ${gradeColor(data?.grade || "B")}`}>
              {data?.grade || "?"}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-white/40">Overall Match</div>
              <div className="text-xl font-mono font-black text-white">
                {data ? `${data.overall_score}%` : "—"}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReviewModalOpen(true)}
              className="px-3 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              title="Generate & Review Tailored Cover Letter & ATS Packet"
            >
              <Sparkles className="w-3.5 h-3.5" /> Tailored Packet
            </button>

            <button
              onClick={() => setPrepModalOpen(true)}
              className="px-3 py-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-[#c3c0ff] border border-indigo-500/30 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              title="Open Tailored Interview Prep Kit"
            >
              <Brain className="w-3.5 h-3.5" /> Prep Strategy
            </button>

            {jobMeta?.url && (
              <a
                href={jobMeta.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="View original posting"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {jobMeta?.id && onApply && (
              <button
                id={`apply-btn-${jobMeta.id}`}
                onClick={() => onApply(jobMeta.id!)}
                disabled={alreadyApplied}
                className={`px-3.5 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  alreadyApplied 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                    : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                }`}
              >
                {alreadyApplied ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Applied</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Express Interest</>
                )}
              </button>
            )}

            <button
              onClick={handleToggle}
              className="p-2 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center gap-1 text-xs font-mono"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <InterviewPrepModal
        isOpen={prepModalOpen}
        onClose={() => setPrepModalOpen(false)}
        studentProfile={candidateProfile}
        job={{
          title: jobMeta?.title || data?.job_title,
          description: postingText,
          company: jobMeta?.company || data?.company,
          location: jobMeta?.location,
        }}
      />

      <ApplicationReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        studentProfile={candidateProfile}
        job={{
          title: jobMeta?.title || data?.job_title,
          description: postingText,
          company: jobMeta?.company || data?.company,
          location: jobMeta?.location,
        }}
      />

      {/* Expanded 5-Dimension Radar / Table Details */}
      {expanded && (
        <div className="p-6 bg-black/40 border-t border-white/5 space-y-6 animate-fadeIn">
          {loading && (
            <div className="py-8 text-center font-mono text-sm text-cyan-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Evaluating 5-Dimension Vector Fit...
            </div>
          )}

          {error && (
            <div className="p-4 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* 5-Dimension Metric Rows */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-mono text-white/40 uppercase tracking-widest px-1">
                  <span>Dimension Vector</span>
                  <span>Score & Weight</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {data.dimensions.map((dim, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-white tracking-wide">
                            {dim.name}
                          </span>
                          {statusBadge(dim.status)}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-mono text-white/40">wt: {dim.weight}</span>
                          <span className="text-sm font-mono font-bold text-cyan-400">{dim.score}%</span>
                        </div>
                      </div>

                      {/* Progress meter */}
                      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-700"
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>

                      {/* Detail tags */}
                      {dim.details && dim.details.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {dim.details.map((d, dIdx) => (
                            <span key={dIdx} className="text-[10px] font-mono text-[#bbc9cd] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths and Growth Gaps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Strengths */}
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-2.5">
                    <Sparkles className="w-3.5 h-3.5" /> Key Strengths
                  </div>
                  <ul className="space-y-1.5">
                    {data.key_strengths.length > 0 ? (
                      data.key_strengths.map((str, i) => (
                        <li key={i} className="text-xs text-[#bbc9cd] flex items-start gap-2">
                          <span className="text-emerald-400 font-mono mt-0.5">•</span> {str}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-white/40 font-mono">No standout advantages detected.</li>
                    )}
                  </ul>
                </div>

                {/* Growth Gaps */}
                <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2.5">
                    <Target className="w-3.5 h-3.5" /> Actionable Gaps
                  </div>
                  <ul className="space-y-1.5">
                    {data.growth_gaps.length > 0 ? (
                      data.growth_gaps.map((gap, i) => (
                        <li key={i} className="text-xs text-[#bbc9cd] flex items-start gap-2">
                          <span className="text-amber-400 font-mono mt-0.5">•</span> {gap}
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-white/40 font-mono">Candidate meets all critical thresholds.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* TypeSafe AI Autoresearch Verification Section */}
              {data.typesafe_telemetry && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c131a] to-[#070b0e] border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] mt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold text-white tracking-wide flex items-center gap-2">
                          TypeSafe AI Autoresearch Telemetry
                          <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-400/30">
                            System One
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-white/40">
                          {data.typesafe_telemetry.model_provider} · 11D Float Matrix
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        CatBoost / GBDT Vector Calibrated
                      </span>
                    </div>
                  </div>

                  {/* Probes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
                    {Object.entries(data.typesafe_telemetry.features).map(([name, feat]) => (
                      <div key={name} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-mono text-white/80 font-bold capitalize">
                            {name.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">
                            {feat.kind === 'intensity' ? `${feat.mean.toFixed(1)}/4.0` : `${Math.round(feat.mean * 100)}%`}
                            {feat.kind === 'intensity' && feat.spread_sd > 0 ? ` (±${feat.spread_sd.toFixed(2)})` : ''}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden mb-1">
                          <div 
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${feat.kind === 'intensity' ? (feat.mean / 4.0) * 100 : feat.mean * 100}%` }}
                          />
                        </div>
                        <div className="text-[9px] font-mono text-white/40 truncate">
                          {feat.interpretation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
