"use client";

import React, { useState } from "react";
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  CheckSquare,
  MessageSquare,
  Building2,
  Briefcase,
  Layers,
  Brain,
  Copy,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export interface InterviewPrepData {
  candidate_name: string;
  role_title: string;
  company: string;
  archetype: string;
  elevator_pitch: string;
  technical_questions: Array<{
    topic: string;
    question: string;
    suggested_angle: string;
  }>;
  behavioral_star_questions: Array<{
    category: string;
    question: string;
    star_starter: string;
    focus_area: string;
  }>;
  research_checklist: string[];
}

interface InterviewPrepModalProps {
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

export const InterviewPrepModal: React.FC<InterviewPrepModalProps> = ({
  isOpen,
  onClose,
  studentProfile,
  job,
}) => {
  const [data, setData] = useState<InterviewPrepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pitch" | "tech" | "behavioral" | "research">("pitch");

  const loadPrepKit = async () => {
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/market/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student: studentProfile,
          job: job,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate interview prep kit");
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not generate prep kit");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && !data) {
      loadPrepKit();
    }
  }, [isOpen]);

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#141b1d] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#c3c0ff] bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20">
                INTERVIEW_PREP_KIT
              </span>
              <span className="text-xs font-mono text-white/40">
                Archetype: {studentProfile?.archetype || "BUILDER"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              {job.title || "Target Role"} Interview Strategy
            </h2>
            <p className="text-xs text-[#bbc9cd] flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-white/40" /> {job.company || "Target Company"}
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
            { id: "pitch", label: "Elevator Pitch", icon: MessageSquare },
            { id: "tech", label: "Technical Q&A", icon: HelpCircle },
            { id: "behavioral", label: "STAR Behavioral", icon: Brain },
            { id: "research", label: "Company Checklist", icon: CheckSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  active
                    ? "border-cyan-400 text-cyan-400 bg-cyan-500/5"
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
              <span>Tailoring STAR interview questions and talking points...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Tab 1: Elevator Pitch */}
              {activeTab === "pitch" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10 relative group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        Tailored 30-Second Introduction
                      </span>
                      <button
                        onClick={() => copyToClipboard(data.elevator_pitch, "pitch")}
                        className="flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-white bg-white/5 px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedSection === "pitch" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedSection === "pitch" ? "Copied" : "Copy Pitch"}
                      </button>
                    </div>
                    <p className="text-[#dde4e5] text-sm leading-relaxed font-sans">
                      "{data.elevator_pitch}"
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-[#bbc9cd] space-y-1 font-mono">
                    <p className="font-bold text-[#c3c0ff] uppercase">Delivery Directives:</p>
                    <p>• Lead with confidence and avoid reading directly from notes.</p>
                    <p>• Tie your academic background directly to the concrete technologies in this job posting.</p>
                  </div>
                </div>
              )}

              {/* Tab 2: Technical Q&A */}
              {activeTab === "tech" && (
                <div className="space-y-4">
                  {data.technical_questions.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                          {q.topic}
                        </span>
                        <span className="font-mono text-[10px] text-white/40">Q_{idx + 1}</span>
                      </div>
                      <p className="text-white text-sm font-semibold">{q.question}</p>
                      <p className="text-xs text-[#bbc9cd] font-mono bg-black/30 p-2.5 rounded border border-white/5">
                        <span className="text-cyan-400 font-bold">Angle:</span> {q.suggested_angle}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: STAR Behavioral */}
              {activeTab === "behavioral" && (
                <div className="space-y-4">
                  {data.behavioral_star_questions.map((b, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20">
                          {b.category}
                        </span>
                        <span className="font-mono text-[10px] text-white/40">Focus: {b.focus_area}</span>
                      </div>
                      <p className="text-white text-sm font-semibold">{b.question}</p>
                      <div className="text-xs text-[#dde4e5] bg-black/40 p-3 rounded-lg border border-white/5 leading-relaxed font-mono">
                        <span className="text-amber-400 font-bold">STAR Starter: </span>
                        {b.star_starter}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Research Checklist */}
              {activeTab === "research" && (
                <div className="space-y-3">
                  <p className="font-mono text-xs text-white/50 uppercase tracking-wider mb-2">
                    Pre-Interview Reconnaissance Checklist
                  </p>
                  {data.research_checklist.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
                      <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-[#dde4e5] leading-relaxed font-sans">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
