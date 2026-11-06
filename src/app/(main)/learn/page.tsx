"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  BookOpen, 
  ExternalLink, 
  ArrowLeft, 
  CheckCircle, 
  Cpu, 
  Layers, 
  Zap, 
  Terminal,
  ShieldCheck,
  Award
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: string;
  description: string;
  modules: string[];
}

const DEFAULT_TRACKS: Track[] = [
  {
    id: "MOD-101",
    title: "Distributed Concurrency & High-Throughput APIs",
    category: "Technical Quotient (TQ / IQ)",
    duration: "4 Hours",
    level: "Advanced",
    description: "Deep dive into async event loops, background worker concurrency, and resilient error recovery.",
    modules: ["AsyncIO Architecture", "Worker Swarms", "Backpressure Handling", "Zero-Leak Pipelines"],
  },
  {
    id: "MOD-102",
    title: "Production Incident Triage & Stress Resilience",
    category: "Adversity Quotient (AQ)",
    duration: "3 Hours",
    level: "Intermediate",
    description: "Scenario-based training for high-pressure system outages, post-mortem leadership, and rapid recovery.",
    modules: ["Outage Containment", "SLA Preservation", "Blameless Post-Mortems", "Incident Command"],
  },
  {
    id: "MOD-103",
    title: "Founder Alignment & Stakeholder Persuasion",
    category: "Executive / Emotional Quotient (EQ / SQ)",
    duration: "3.5 Hours",
    level: "Executive",
    description: "Strategic communication, technical trade-off negotiation, and executive narrative alignment.",
    modules: ["C-Suite Pitching", "Scope Governance", "Cross-Functional Cohesion", "Strategic Positioning"],
  },
  {
    id: "MOD-104",
    title: "Secure Identity, JWT & Microservice Vaulting",
    category: "Systems Security",
    duration: "2.5 Hours",
    level: "Specialist",
    description: "Zero-trust token handling, LTI 1.3 cryptographic handshakes, and database RLS policy enforcement.",
    modules: ["RS256 & JWKS Keystores", "Row Level Security", "HMAC Webhook Guards", "Token Rotation"],
  },
];

function LearnContent() {
  const searchParams = useSearchParams();
  const targetedTopic = searchParams.get("topic") || "";
  const [selectedTrack, setSelectedTrack] = useState<Track>(
    DEFAULT_TRACKS.find(t => targetedTopic && t.title.toLowerCase().includes(targetedTopic.toLowerCase())) || DEFAULT_TRACKS[0]
  );
  const [inTerminalMode, setInTerminalMode] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#0e1416] text-[#dde4e5] p-6 lg:p-12 font-mono">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 uppercase tracking-widest mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight flex items-center gap-4">
              <BookOpen className="w-9 h-9 text-cyan-400" /> C2C_Academy // Remediation_Terminal
            </h1>
            <p className="text-xs text-white/50 uppercase tracking-[0.3em] font-bold mt-2">
              ACCREDITED_LEARNING_PIPELINE &bull; DOMAIN: c2c.mytestbed.tech/learn
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/assessment"
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-widest rounded-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              Retake_The_Ordeal
            </Link>
          </div>
        </div>

        {/* Targeted Gap Directive Banner */}
        {targetedTopic && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 p-6 rounded-xl flex items-start gap-4 backdrop-blur-md">
            <Zap className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
            <div>
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">
                Targeted Remediation Directive Received
              </span>
              <p className="text-white text-sm font-semibold mt-1">
                &ldquo;{targetedTopic}&rdquo;
              </p>
              <p className="text-xs text-white/60 mt-1">
                Your recent psychometric evaluation flagged this competency. Complete the curriculum below to verify and clear this gap.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid: Track List & Interactive Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Track Selection Column */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs text-white/40 uppercase tracking-[0.25em] font-black mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Remediation_Curricula
            </h3>

            {DEFAULT_TRACKS.map((track) => {
              const isSelected = selectedTrack.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  className={`p-6 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? "bg-white/10 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                      : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                      {track.category}
                    </span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/70">
                      {track.duration}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white mb-2 leading-snug">
                    {track.title}
                  </h4>

                  <p className="text-xs text-[#bbc9cd] line-clamp-2 leading-relaxed">
                    {track.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-white/40">
                    <span>Level: {track.level}</span>
                    <span className="text-cyan-400/80 font-bold">Select Module &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Player / Viewer Column */}
          <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                  Active Course Terminal // {selectedTrack.id}
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">
                  {selectedTrack.title}
                </h2>
              </div>
              <button
                onClick={() => setInTerminalMode(!inTerminalMode)}
                className="px-4 py-2 border border-white/10 text-xs text-white/80 rounded hover:bg-white/10 transition-colors inline-flex items-center gap-2"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                {inTerminalMode ? "View Syllabus" : "Launch Terminal"}
              </button>
            </div>

            {inTerminalMode ? (
              /* Embedded Local LMS Terminal / Runner */
              <div className="bg-black/90 border border-cyan-500/30 rounded-xl p-6 font-mono text-xs text-cyan-300 min-h-[380px] flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="text-white/40">// Initializing native learning runner for {selectedTrack.id}...</p>
                  <p className="text-cyan-400">&gt; Connecting to host endpoint: c2c.mytestbed.tech/lms</p>
                  <p className="text-emerald-400">&gt; Authenticated student telemetry verified (0 AI tokens consumed)</p>
                  <div className="p-4 bg-white/5 border border-white/10 rounded my-4 text-white/90">
                    <p className="font-bold text-sm text-white mb-2">Lab Exercise: {selectedTrack.modules[0]}</p>
                    <p className="text-white/70 leading-relaxed text-xs">
                      Analyze the bottleneck in the event loop pipeline. Identify why background jobs block when high-concurrency requests arrive without an async gatekeeper.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-6">
                  <span className="text-white/50 text-[10px]">STATUS: SIMULATION_ACTIVE</span>
                  <Link
                    href={`/lms/course/view.php?id=${selectedTrack.id}`}
                    target="_blank"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
                  >
                    Open Full LMS View <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Detailed Curriculum Breakdown */
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs text-white/40 uppercase tracking-widest font-black mb-3">
                    Course Overview
                  </h4>
                  <p className="text-sm text-[#bbc9cd] leading-relaxed">
                    {selectedTrack.description} This module is mapped directly to the C2C corporate evaluation matrix. Mastering these competencies recalculates candidate job-matching fit.
                  </p>
                </div>

                <div>
                  <h4 className="text-xs text-white/40 uppercase tracking-widest font-black mb-3">
                    Curriculum Units
                  </h4>
                  <div className="space-y-2">
                    {selectedTrack.modules.map((mod, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-white/90 font-medium">{mod}</span>
                        </div>
                        <span className="text-white/30 text-[10px] uppercase font-bold">Unit {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Verified Upon Completion</span>
                  </div>
                  <button
                    onClick={() => setInTerminalMode(true)}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-widest rounded-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    Start_Remediation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e1416] p-12 font-mono text-white">Loading Academy...</div>}>
      <LearnContent />
    </Suspense>
  );
}
