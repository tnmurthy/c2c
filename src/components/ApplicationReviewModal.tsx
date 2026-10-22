"use client";

import React, { useState } from "react";
import {
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  Loader2,
  ShieldCheck,
  Layers,
  Send,
  Building2,
  FileCheck2,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export interface ReviewedApplicationData {
  candidate_name: string;
  role_title: string;
  company: string;
  ats_audit: {
    score: number;
    grade: string;
    keyword_coverage_pct: number;
    matched_keywords: string[];
    missing_keywords: string[];
    length_verdict: string;
    word_count: number;
    critique_notes: string[];
  };
  final_application_packet: {
    cover_letter_text: string;
    resume_context: Record<string, any>;
    cold_email?: string;
    linkedin_note?: string;
    founder_message?: string;
    follow_up_sequence?: string[];
  };
}

interface ApplicationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentProfile: Record<string, any>;
  job: {
    title?: string;
    description?: string;
    company?: string;
    location?: string;
  };
}

export const ApplicationReviewModal: React.FC<ApplicationReviewModalProps> = ({
  isOpen,
  onClose,
  studentProfile,
  job,
}) => {
  const [data, setData] = useState<ReviewedApplicationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cover_letter" | "ats_audit" | "outreach">("cover_letter");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadPipeline = async () => {
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/market/generate/reviewed-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student: studentProfile,
          job: job,
        }),
      });
      if (!res.ok) throw new Error("Failed to execute Drafter-Reviewer pipeline");
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed generating reviewed application packet");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && !data) {
      loadPipeline();
    }
  }, [isOpen]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#141b1d] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                TWO_PASS_DRAFTER_REVIEWER
              </span>
              {data && (
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  ATS Score: {data.ats_audit.score}% (Grade {data.ats_audit.grade})
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
              Tailored Application & ATS Review
            </h2>
            <p className="text-xs text-[#bbc9cd] flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-white/40" /> {job.company || "Target Entity"} · {job.title || "Opportunity"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 px-6 bg-black/20 font-mono text-xs overflow-x-auto">
          {[
            { id: "cover_letter", label: "Revised Cover Letter", icon: FileText },
            { id: "ats_audit", label: "ATS Keyword Audit", icon: ShieldCheck },
            { id: "outreach", label: "Multi-Channel Outreach", icon: Send },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  active
                    ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-20 text-center font-mono text-sm text-cyan-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span>Pass 1: Drafting Application Context → Pass 2: Reviewing ATS Alignment...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Tab 1: Revised Cover Letter */}
              {activeTab === "cover_letter" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-white/40 uppercase">
                      {data.ats_audit.word_count} words · {data.ats_audit.length_verdict}
                    </span>
                    <button
                      onClick={() => copyToClipboard(data.final_application_packet.cover_letter_text, "cl")}
                      className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-950/60 transition-all"
                    >
                      {copiedKey === "cl" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === "cl" ? "Copied" : "Copy Cover Letter"}
                    </button>
                  </div>

                  <div className="p-6 rounded-xl bg-black/40 border border-white/10 font-sans text-sm text-[#dde4e5] whitespace-pre-line leading-relaxed">
                    {data.final_application_packet.cover_letter_text}
                  </div>
                </div>
              )}

              {/* Tab 2: ATS Audit */}
              {activeTab === "ats_audit" && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 font-mono">
                      <div className="text-[10px] text-white/40 uppercase">ATS Grade</div>
                      <div className="text-2xl font-black text-emerald-400">{data.ats_audit.grade} ({data.ats_audit.score}%)</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 font-mono">
                      <div className="text-[10px] text-white/40 uppercase">Keyword Coverage</div>
                      <div className="text-2xl font-black text-cyan-400">{data.ats_audit.keyword_coverage_pct}%</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 font-mono">
                      <div className="text-[10px] text-white/40 uppercase">Length Status</div>
                      <div className="text-sm font-bold text-white mt-1">{data.ats_audit.length_verdict}</div>
                    </div>
                  </div>

                  {/* Keywords Grid */}
                  <div className="space-y-3">
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Matched ATS Keywords ({data.ats_audit.matched_keywords.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {data.ats_audit.matched_keywords.map((kw, i) => (
                        <span key={i} className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded">
                          ✓ {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Reviewer Critique Notes */}
                  {data.ats_audit.critique_notes.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                        Reviewer Agent Audit Directives
                      </span>
                      <div className="space-y-2">
                        {data.ats_audit.critique_notes.map((note, i) => (
                          <div key={i} className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs font-mono text-[#bbc9cd] flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Multi-Channel Outreach */}
              {activeTab === "outreach" && (
                <div className="space-y-4">
                  {data.final_application_packet.cold_email && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-cyan-400 uppercase">Hiring Manager Cold Email</span>
                        <button
                          onClick={() => copyToClipboard(data.final_application_packet.cold_email!, "email")}
                          className="flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-white bg-white/5 px-2.5 py-1 rounded"
                        >
                          {copiedKey === "email" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-[#dde4e5] font-sans whitespace-pre-line leading-relaxed bg-black/40 p-3 rounded border border-white/5">
                        {data.final_application_packet.cold_email}
                      </p>
                    </div>
                  )}

                  {data.final_application_packet.linkedin_note && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-400 uppercase">LinkedIn Recruiter Direct Message</span>
                        <button
                          onClick={() => copyToClipboard(data.final_application_packet.linkedin_note!, "dm")}
                          className="flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-white bg-white/5 px-2.5 py-1 rounded"
                        >
                          {copiedKey === "dm" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-[#dde4e5] font-sans whitespace-pre-line leading-relaxed bg-black/40 p-3 rounded border border-white/5">
                        {data.final_application_packet.linkedin_note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
