"use client";

import { useParams } from "next/navigation";
import { 
  TrendingUp, 
  ExternalLink, 
  AlertCircle, 
  Loader2, 
  ChevronRight,
  Shield,
  Zap,
  Target,
  Brain,
  Layers,
  Activity,
  Cpu,
  Database,
  Copy,
  Check,
  Briefcase,
  CheckCircle,
  Clock,
  Send
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";
import GrowthRadar from "@/components/charts/GrowthRadar";
import { useRequireAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { DimensionScores, Alert } from "@/types";
import { authFetch } from '@/lib/authFetch';
import ProfileCompletionWidget from "@/components/profile/ProfileCompletionWidget";
import { supabase } from "@/lib/supabase";

interface Application {
  id: string;
  job_id: string;
  status: 'expressed_interest' | 'shortlisted' | 'interviewing' | 'offered' | 'rejected';
  applied_at: string;
  job_postings?: { title: string; location?: string; role_type?: string; };
}

interface DashboardData {
  student: {
    full_name: string;
    department: string;
  };
  assessments: Array<{
    dimension_scores?: DimensionScores;
    primary_profile?: string;
    founder_fit?: Record<string, number>;
    development_report?: {
      profile_summary?: string;
      actionable_feedback?: string[];
    };
  }>;
  peer_scores?: DimensionScores;
}

export default function Dashboard() {
  const { id } = useParams();
  const { user, loading: authLoading } = useRequireAuth();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyFeedbackLink = () => {
    const link = `${window.location.origin}/feedback/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (authLoading) return;
    async function fetchData() {
      try {
        const res = await authFetch(`/api/student/${id}`);
        if (!res.ok) {
          throw new Error("DASHBOARD_FETCH_ERROR");
        }
        const json = await res.json();
        setData(json);

        try {
          const alertsRes = await authFetch(`/api/alerts/student/${id}`);
          if (alertsRes.ok) {
            const alertsJson = await alertsRes.json();
            setAlerts(alertsJson);
          }
        } catch (e) {
          console.error("Alerts fetch error", e);
        }

        try {
          const appsRes = await authFetch(`/api/student/${id}/applications`);
          if (appsRes.ok) {
            const appsJson = await appsRes.json();
            setApplications(appsJson);
          }
        } catch (e) {
          console.error("Applications fetch error", e);
        }
      } catch (err: unknown) {
        console.error(err);
        setError("Failed to synchronize student metrics from the database node.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();

    // Supabase Realtime Subscriptions
    const channel = supabase.channel('student-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        (payload) => {
          console.log('Realtime update: applications', payload);
          fetchData(); // Refetch to keep data consistent
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('Realtime update: leads', payload);
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'development_reports' },
        (payload) => {
          console.log('Realtime update: development_reports', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, authLoading]);

  const assessment = data?.assessments?.[0] || {};
  const scores = assessment.dimension_scores || { Technical: 85, Product: 92, Leadership: 78, Communication: 88, Adaptability: 70 };
  const report = assessment.development_report || {};
  const maxFitValue = assessment.founder_fit ? Math.max(...Object.values(assessment.founder_fit as Record<string, number>)) : 96;
  const founderFitType = assessment.founder_fit ? Object.keys(assessment.founder_fit)[0].toUpperCase() : "THE_BUILDER";

  const appliedJobIds = new Set(applications.map((a) => a.job_id));

  const handleApply = useCallback(async (jobId: string) => {
    if (!jobId || applyingTo) return;
    setApplyingTo(jobId);
    try {
      const res = await authFetch(`/api/student/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      if (res.ok) {
        const newApp: Application = await res.json();
        setApplications((prev) => [newApp, ...prev.filter((a) => a.job_id !== jobId)]);
      }
    } catch (e) {
      console.error("Apply error", e);
    } finally {
      setApplyingTo(null);
    }
  }, [id, applyingTo]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center p-6 font-mono text-center">
        <div className="bg-black/60 border border-red-500/30 p-8 rounded-xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-[0.2em]">Telemetry Connection Failed</h2>
          <p className="text-[#bbc9cd] text-sm mb-6 leading-relaxed">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-red-950/40 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-950/60 active:scale-95 transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return <LoadingScreen title="Synchronizing Matrix" subtitle="Establishing Secure Datalink" />;
  }

  return (
    <div className="min-h-screen bg-[#0e1416] text-[#dde4e5] selection:bg-cyan-500/30 selection:text-white pb-24 relative overflow-hidden font-sans">
      {/* Ambient Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/5 blur-[150px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] -z-10 pointer-events-none"></div>



      <main className="max-w-[1500px] mx-auto px-6 pt-12">
        
        {data?.student && (
          <ProfileCompletionWidget 
            student={data.student} 
            onProfileUpdate={() => window.location.reload()} 
          />
        )}

        {/* Profile Hero Section */}
        <section className="mb-12">
          <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none"></div>
            <div className="absolute -top-24 -right-24 opacity-5 rotate-12">
               <Layers className="w-96 h-96 text-cyan-400" />
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-sm font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-[0.3em] mb-8">
                  <Activity className="w-3.5 h-3.5" /> Cognitive_Archetype_Unlocked
                </div>
                <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-6 leading-[0.8]">
                  <span className="block text-white/20 text-3xl md:text-4xl font-mono mb-4 uppercase tracking-[0.2em]">STU_STATUS: LEGEND</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-indigo-600 drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                    {founderFitType}
                  </span>
                </h1>
                <p className="max-w-2xl text-lg md:text-2xl text-[#bbc9cd] font-medium leading-relaxed font-sans mt-10 border-l-4 border-cyan-500/30 pl-8 mb-8">
                  {report.profile_summary}
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start border-l-4 border-transparent pl-8">
                  <Link 
                    href={`/portfolio/${id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-sm font-mono text-xs font-black text-cyan-400 uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_25px_rgba(6,182,212,0.2)]"
                  >
                    <Cpu className="w-4 h-4" /> Boot_Retro_Portfolio
                  </Link>
                  <a 
                    href={`/api/export/student/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 rounded-sm font-mono text-xs font-black text-indigo-400 uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_25px_rgba(99,102,241,0.2)]"
                  >
                    <Database className="w-4 h-4" /> Export_Dossier_PDF
                  </a>
                  <a 
                    href={`/api/export/interview-guide/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 rounded-sm font-mono text-xs font-black text-emerald-400 uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                  >
                    <Shield className="w-4 h-4" /> Export_Interview_Guide
                  </a>
                  <button 
                    onClick={copyFeedbackLink}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 rounded-sm font-mono text-xs font-black text-pink-400 uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(236,72,153,0.1)] hover:shadow-[0_0_25px_rgba(236,72,153,0.2)]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" /> Link_Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Get_360_Feedback_Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="shrink-0 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border border-white/10 bg-black/60 flex items-center justify-center p-12 backdrop-blur-2xl">
                  <div className="text-center">
                    <span className="block font-mono text-xs text-cyan-400/60 uppercase tracking-[0.4em] mb-2 font-black">FIT_INDEX</span>
                    <span className="block text-8xl md:text-9xl font-black text-white tracking-tighter">
                      {maxFitValue}<span className="text-3xl md:text-4xl text-cyan-400 opacity-50">%</span>
                    </span>
                  </div>
                  {/* Rotating decorative elements */}
                  <svg className="absolute inset-0 w-full h-full animate-[spin_30s_linear_infinite]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" className="text-cyan-400/20" />
                  </svg>
                  <svg className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)] animate-[spin_20s_linear_infinite_reverse]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="10 40" className="text-indigo-500/20" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Intelligence Matrix - Radar Chart Area */}
          <div className="lg:col-span-7">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 h-full relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full"></div>
              
              <div className="flex justify-between items-start mb-16">
                <div>
                  <h2 className="text-3xl font-black text-white font-mono uppercase tracking-tighter flex items-center gap-4">
                    <Brain className="w-8 h-8 text-cyan-400" /> Intelligence_Matrix
                  </h2>
                  <p className="text-[10px] text-cyan-400/50 uppercase tracking-[0.4em] font-black mt-3">360°_NEURAL_CAPACITY_BENCHMARKS</p>
                </div>
                <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/10 rounded-sm font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">
                  <Database className="w-3.5 h-3.5" /> ARCHIVE_STABLE_001
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-400/5 blur-3xl rounded-full scale-75"></div>
                  <GrowthRadar data={scores as { [key: string]: number }} peerData={data?.peer_scores as { [key: string]: number } | undefined} />
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-mono text-[10px] text-white/20 uppercase tracking-[0.4em] font-black mb-6">Vector_Decomposition</h4>
                  {Object.entries(scores).map(([key, value]) => (
                    <div key={key} className="bg-white/5 border border-white/5 p-6 rounded-xl group hover:border-cyan-500/30 transition-all">
                      <div className="flex justify-between items-end mb-4">
                        <span className="font-mono text-[11px] font-black text-white/40 uppercase tracking-[0.2em] group-hover:text-cyan-400 transition-colors">{key}</span>
                        <div className="flex items-baseline gap-1">
                           <span className="text-3xl font-black text-white tracking-tighter">{value as number}</span>
                           <span className="text-[10px] font-bold text-white/20 uppercase">PTS</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                          style={{ width: `${value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Development Report - High Tech Data Cards */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {/* Targeted Directives */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-transparent"></div>
              
              <div className="mb-12">
                <h2 className="text-2xl font-black text-white font-mono uppercase tracking-tighter flex items-center gap-4">
                  <TrendingUp className="w-7 h-7 text-indigo-400" /> Optimization_Protocols
                </h2>
                <p className="text-[10px] text-indigo-400/50 uppercase tracking-[0.4em] font-black mt-3">DIRECTIVE_SET_v2.0_SYNCED</p>
              </div>

              <div className="space-y-4">
                {(report.actionable_feedback || []).map((directive: string, i: number) => (
                  <div key={i} className="group/card relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-indigo-600/20 rounded-xl blur opacity-0 group-hover/card:opacity-100 transition duration-500"></div>
                    <div className="relative bg-black/60 border border-white/5 p-6 rounded-xl flex items-start gap-6 backdrop-blur-md transition-all group-hover/card:bg-black/40 group-hover/card:translate-x-2">
                      <div className="shrink-0 w-12 h-12 rounded-sm bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-mono text-indigo-400 font-black text-lg">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1">
                        <p className="text-[#bbc9cd] font-sans font-medium leading-relaxed text-sm md:text-base group-hover/card:text-white transition-colors uppercase tracking-tight">
                          {directive}
                        </p>
                      </div>
                      <ChevronRight className="shrink-0 w-6 h-6 text-white/5 group-hover/card:text-indigo-400 transition-all self-center transform group-hover/card:translate-x-1" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-8 bg-indigo-600/5 border border-indigo-600/20 rounded-xl text-center relative overflow-hidden group/cta">
                 <div className="absolute inset-0 bg-cyber-grid bg-[length:20px_20px] opacity-10"></div>
                 <div className="relative z-10">
                    {data?.assessments && data.assessments.length > 0 ? (
                      <>
                        <h4 className="text-white font-mono font-black uppercase tracking-[0.3em] text-xs mb-4">Legend_Network_Access</h4>
                        <p className="text-[11px] text-[#c3c0ff]/60 uppercase tracking-widest mb-8 leading-relaxed max-w-[200px] mx-auto font-bold font-mono">Bridge to verified high-impact opportunities</p>
                        <Link 
                          href="/employer" 
                          className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)]"
                        >
                          Explore_Career_Pool <ExternalLink className="w-4 h-4" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <h4 className="text-white font-mono font-black uppercase tracking-[0.3em] text-xs mb-4 text-cyan-400">Neural_Sync_Required</h4>
                        <p className="text-[11px] text-[#c3c0ff]/60 uppercase tracking-widest mb-8 leading-relaxed max-w-[200px] mx-auto font-bold font-mono">Take the cognitive ordeal to map your skill quotients</p>
                        <Link 
                          href="/assessment" 
                          className="inline-flex items-center gap-3 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-sm font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]"
                        >
                          Initialize_The_Ordeal <ExternalLink className="w-4 h-4" />
                        </Link>
                      </>
                    )}
                 </div>
              </div>
            </div>

            {/* Match Alerts - Market Scout Data Cards */}
            {alerts && alerts.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-transparent"></div>
                
                <div className="mb-12">
                  <h2 className="text-2xl font-black text-white font-mono uppercase tracking-tighter flex items-center gap-4">
                    <Target className="w-7 h-7 text-cyan-400" /> Market_Scout_Sync
                  </h2>
                  <p className="text-[10px] text-cyan-400/50 uppercase tracking-[0.4em] font-black mt-3">LIVE_OPPORTUNITY_FEED</p>
                </div>

                <div className="space-y-4">
                  {alerts.slice(0, 5).map((alert: Alert, i: number) => {
                    const jobId = (alert as Alert & { job_id?: string }).job_id || alert.market_leads?.id;
                    const alreadyApplied = jobId ? appliedJobIds.has(jobId) : false;
                    const isApplying = applyingTo === jobId;
                    return (
                      <div key={i} className="relative group/alert">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400/20 to-indigo-600/20 rounded-xl blur opacity-0 group-hover/alert:opacity-100 transition duration-500"></div>
                        <div className="relative bg-black/60 border border-white/5 p-6 rounded-xl flex flex-col gap-4 backdrop-blur-md transition-all group-hover/alert:bg-black/40">
                          <div className="flex justify-between items-start gap-6">
                            <h3 className="text-[#bbc9cd] font-sans font-black group-hover/alert:text-white transition-colors line-clamp-1 uppercase tracking-tight text-lg">
                              {alert.market_leads?.name || 'High Impact Role'}
                            </h3>
                            <div className="shrink-0 flex flex-col items-end">
                              <div className="font-mono text-[9px] text-cyan-400/40 font-black uppercase tracking-widest mb-1">MATCH</div>
                              <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-sm font-mono text-xs font-black text-cyan-400">
                                {(alert as Alert & { score?: number }).score || alert.market_leads?.ai_score || 0}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                            <span className="flex items-center gap-2 font-mono text-[10px] text-white/30 uppercase tracking-widest font-bold">
                              <Database className="w-3.5 h-3.5" /> {alert.market_leads?.company || 'Confidential'}
                            </span>
                            <div className="flex items-center gap-2">
                              {alert.lead_url && (
                                <a
                                  href={alert.lead_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-[10px] font-black font-mono text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {jobId && (
                                <button
                                  id={`apply-btn-${jobId}`}
                                  onClick={() => handleApply(jobId)}
                                  disabled={alreadyApplied || isApplying}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                                    alreadyApplied
                                      ? "bg-green-500/10 border border-green-500/20 text-green-400 cursor-default"
                                      : isApplying
                                      ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 opacity-60"
                                      : "bg-[#8aebff]/10 border border-[#8aebff]/30 text-[#8aebff] hover:bg-[#8aebff]/20"
                                  }`}
                                >
                                  {alreadyApplied ? (
                                    <><CheckCircle className="w-3 h-3" /> Applied</>
                                  ) : isApplying ? (
                                    <><div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" /> Sending…</>
                                  ) : (
                                    <><Send className="w-3 h-3" /> Express_Interest</>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {alerts.length > 5 && (
                  <button className="w-full mt-6 py-4 bg-white/5 border border-white/10 rounded-sm font-mono text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all">
                    Load_More_Matches_({alerts.length - 5})
                  </button>
                )}
              </div>
            )}

            {/* Applications Pipeline */}
            {applications.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#c3c0ff] to-transparent"></div>
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-white font-mono uppercase tracking-tighter flex items-center gap-4">
                    <Briefcase className="w-7 h-7 text-[#c3c0ff]" /> Application_Pipeline
                  </h2>
                  <p className="text-[10px] text-[#c3c0ff]/50 uppercase tracking-[0.4em] font-black mt-3">CAREER_STATUS_FEED</p>
                </div>
                <div className="space-y-3">
                  {applications.slice(0, 8).map((app) => {
                    const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
                      expressed_interest: { label: "Expressed Interest", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20", icon: <Send className="w-3 h-3" /> },
                      shortlisted:        { label: "Shortlisted",        color: "text-[#c3c0ff] bg-[#c3c0ff]/10 border-[#c3c0ff]/20", icon: <CheckCircle className="w-3 h-3" /> },
                      interviewing:       { label: "Interviewing",       color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: <Clock className="w-3 h-3" /> },
                      offered:            { label: "Offer Received",    color: "text-green-400 bg-green-400/10 border-green-400/20", icon: <CheckCircle className="w-3 h-3" /> },
                      rejected:           { label: "Not Selected",      color: "text-red-400 bg-red-400/10 border-red-400/20", icon: <AlertCircle className="w-3 h-3" /> },
                    };
                    const cfg = statusConfig[app.status] || statusConfig.expressed_interest;
                    return (
                      <div
                        key={app.id}
                        id={`app-row-${app.id}`}
                        className="flex items-center justify-between p-4 bg-black/30 border border-white/5 rounded-xl hover:bg-black/50 transition-all"
                      >
                        <div>
                          <p className="font-mono text-sm text-[#dde4e5] font-medium">
                            {app.job_postings?.title || "Job Opportunity"}
                          </p>
                          <p className="text-xs text-[#bbc9cd] mt-0.5">
                            {app.job_postings?.location || "Remote"} · {new Date(app.applied_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
      
      {/* Decorative Fixed Elements */}
      <div className="fixed top-1/2 left-4 -translate-y-1/2 hidden 2xl:flex flex-col gap-8 opacity-10">
         <div className="font-mono text-[10px] text-white uppercase tracking-[0.5em] font-black -rotate-90 origin-left">MATRIX_SYNCHRONIZED</div>
         <div className="h-32 w-[1px] bg-gradient-to-b from-transparent via-white to-transparent mx-auto"></div>
         <div className="font-mono text-[10px] text-white uppercase tracking-[0.5em] font-black -rotate-90 origin-left">EST_2024.C2C</div>
      </div>
    </div>
  );
}
