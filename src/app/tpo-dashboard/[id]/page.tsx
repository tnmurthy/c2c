"use client";

import React, { useState, useEffect } from "react";
import Link from 'next/link';
import type { Candidate } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { 
  Users, 
  Download, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingDown, 
  Calendar,
  ChevronDown,
  Plus,
  HelpCircle,
  LogOut,
  Home,
  LayoutDashboard,
  Zap,
  ShieldCheck
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/lib/supabase";
import { authFetch } from '@/lib/authFetch';

interface TPOCohortData {
  averages: {
    IQ: number;
    EQ: number;
    SQ: number;
    AQ: number;
    SpQ: number;
  };
  founder_distribution: {
    Builder: number;
    Leader: number;
    Rainmaker: number;
    Anchor: number;
  };
  support_needs: string[];
}

export default function TPODashboard() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ['institution'] });
  const [data, setData] = useState<TPOCohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interventionCollapsed, setInterventionCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      try {
        const res = await authFetch(`/api/cohort/${id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          throw new Error("Failed to fetch");
        }
      } catch (err: unknown) {
        console.error("Fetch error:", err);
        setError("Failed to synchronize institutional cohort metrics from the database node.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // Supabase Realtime Subscriptions
    const channel = supabase.channel('tpo-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        (payload) => {
          console.log('Realtime update: students', payload);
          fetchData(); // Refetch cohort averages and distributions
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assessments' },
        (payload) => {
          console.log('Realtime update: assessments', payload);
          fetchData(); 
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        (payload) => {
          console.log('Realtime update: applications', payload);
          fetchData(); // Refetch placement funnel metrics
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, authLoading]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center p-6 font-mono text-center">
        <div className="bg-black/60 border border-[#ffb4ab]/30 p-8 rounded-xl max-w-md">
          <ShieldAlert className="w-12 h-12 text-[#ffb4ab] mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-[0.2em]">Telemetry Connection Failed</h2>
          <p className="text-[#bbc9cd] text-sm mb-6 leading-relaxed">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-[#93000a]/20 border border-[#ffb4ab]/40 text-[#ffb4ab] text-xs font-bold uppercase tracking-widest hover:bg-[#93000a]/40 active:scale-95 transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || loading || !data) {
    return <LoadingScreen title="Syncing Cohort Telemetry" subtitle="Establishing connection to institutional node..." />;
  }

  return (
    <>
      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <p className={`text-[#8aebff] text-[12px] font-bold tracking-[0.1em] mb-2 font-mono`}>ADMINISTRATION COMMAND CENTER // COHORT 2024.B</p>
              <h1 className="text-5xl font-extrabold text-white tracking-tight">Institutional Analytics</h1>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center bg-[#2f3638] px-4 py-2 border border-white/10">
                <Calendar className="text-[#8aebff] w-4 h-4 mr-2" />
                <span className={`text-[#dde4e5] text-xs font-medium tracking-[0.05em] font-mono`}>MAY 2024 - JUNE 2024</span>
              </div>
              <button className="bg-[#8aebff]/10 border border-[#8aebff]/40 text-[#8aebff] px-4 py-2 flex items-center gap-2 hover:bg-[#8aebff]/20 transition-all text-[12px] font-bold tracking-[0.1em] rounded">
                <Download className="w-4 h-4" /> EXPORT REPORT
              </button>
            </div>
          </div>

          {/* Top: KPI Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#0f172a]/40 backdrop-blur-md p-6 border border-white/10 rounded-xl relative overflow-hidden group hover:border-[#8aebff]/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#8aebff]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[#bbc9cd] text-[10px] font-bold tracking-[0.1em] uppercase font-mono`}>Total Enrolled Students</span>
                <Users className="text-[#8aebff] w-5 h-5" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className={`text-4xl font-bold text-white font-mono`}>4,282</h3>
                <span className={`text-[#10b981] text-[10px] font-bold font-mono`}>+12.4%</span>
              </div>
              <div className="mt-4 w-full bg-[#1a2122] h-1 rounded-full overflow-hidden">
                <div className="h-full bg-[#8aebff]" style={{ width: '78%' }}></div>
              </div>
            </div>

            <div className="bg-[#0f172a]/40 backdrop-blur-md p-6 border border-white/10 rounded-xl relative overflow-hidden group hover:border-[#c3c0ff]/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#c3c0ff]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[#bbc9cd] text-[10px] font-bold tracking-[0.1em] uppercase font-mono`}>Average Cohort EQ</span>
                <Activity className="text-[#c3c0ff] w-5 h-5" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className={`text-4xl font-bold text-white font-mono`}>{data.averages.EQ.toFixed(1)}<span className="text-xl">/100</span></h3>
                <span className={`text-[#10b981] text-[10px] font-bold font-mono`}>▲ High</span>
              </div>
              <div className="mt-4 w-full bg-[#1a2122] h-1 rounded-full overflow-hidden">
                <div className="h-full bg-[#c3c0ff]" style={{ width: `${data.averages.EQ}%` }}></div>
              </div>
            </div>

            <div className="bg-[#0f172a]/40 backdrop-blur-md p-6 border border-white/10 rounded-xl relative overflow-hidden group hover:border-[#ffd6a3]/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#ffd6a3]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[#bbc9cd] text-[10px] font-bold tracking-[0.1em] uppercase font-mono`}>Placement Readiness %</span>
                <Zap className="text-[#ffd6a3] w-5 h-5" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className={`text-4xl font-bold text-white font-mono`}>67.8<span className="text-xl">%</span></h3>
                <span className={`text-[#bbc9cd] text-[10px] font-bold font-mono`}>Target: 75%</span>
              </div>
              <div className="mt-4 w-full bg-[#1a2122] h-1 rounded-full overflow-hidden">
                <div className="h-full bg-[#ffd6a3]" style={{ width: '67.8%' }}></div>
              </div>
            </div>
          </section>

          {/* Middle: Horizontal Bar Chart Heatmap (Founder Profiles) */}
          <section className="mb-12">
            <div className="bg-[#0f172a]/40 backdrop-blur-md p-8 border border-white/10 rounded-xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white">Founder Profile Distribution</h3>
                  <p className="text-[#bbc9cd] text-sm mt-1">Student behavioral archetypes calculated via AI Match Score</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#8aebff] rounded-sm"></div>
                    <span className={`text-[10px] text-[#bbc9cd] uppercase tracking-wider font-bold font-mono`}>Builder</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#c3c0ff] rounded-sm"></div>
                    <span className={`text-[10px] text-[#bbc9cd] uppercase tracking-wider font-bold font-mono`}>Leader</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#ffd6a3] rounded-sm"></div>
                    <span className={`text-[10px] text-[#bbc9cd] uppercase tracking-wider font-bold font-mono`}>Anchor</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Builder Profile */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className={`text-lg font-bold text-white font-mono`}>BUILDER <span className="text-xs text-[#bbc9cd] opacity-60 font-normal">(Technical & Iterative)</span></span>
                    <span className={`text-[#8aebff] font-bold font-mono`}>{data.founder_distribution.Builder}% Density</span>
                  </div>
                  <div className="h-10 w-full flex bg-[#1a2122] rounded overflow-hidden border border-white/5">
                    <div className="h-full bg-[#8aebff] relative group" style={{ width: `${data.founder_distribution.Builder}%` }}>
                      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_50%,#fff_50%,#fff_75%,transparent_75%,transparent)] bg-[length:10px_10px]"></div>
                    </div>
                    <div className="h-full bg-[#c3c0ff]" style={{ width: '30%' }}></div>
                    <div className="h-full bg-[#ffd6a3]" style={{ width: '37%' }}></div>
                  </div>
                </div>

                {/* Leader Profile */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className={`text-lg font-bold text-white font-mono`}>LEADER <span className="text-xs text-[#bbc9cd] opacity-60 font-normal">(Visionary & Strategic)</span></span>
                    <span className={`text-[#c3c0ff] font-bold font-mono`}>{data.founder_distribution.Leader}% Density</span>
                  </div>
                  <div className="h-10 w-full flex bg-[#1a2122] rounded overflow-hidden border border-white/5">
                    <div className="h-full bg-[#8aebff]" style={{ width: '25%' }}></div>
                    <div className="h-full bg-[#c3c0ff] relative group" style={{ width: `${data.founder_distribution.Leader}%` }}>
                      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_50%,#fff_50%,#fff_75%,transparent_75%,transparent)] bg-[length:10px_10px]"></div>
                    </div>
                    <div className="h-full bg-[#ffd6a3]" style={{ width: '49%' }}></div>
                  </div>
                </div>
              </div>

              <div className={`mt-8 pt-4 border-t border-white/5 flex justify-between text-[10px] font-bold text-[#bbc9cd] uppercase tracking-widest font-mono`}>
                <span>0% Density</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100% Saturation</span>
              </div>
            </div>
          </section>

          {/* Cohort Industry Sector Fit & Quotient Balance */}
          <section className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Industry Placement Fit Heatmap */}
            <div className="bg-[#0f172a]/40 backdrop-blur-md p-8 border border-white/10 rounded-xl">
              <h3 className="text-2xl font-bold text-white mb-2">Industry Alignment Fit</h3>
              <p className="text-[#bbc9cd] text-sm mb-6">Aggregated cohort suitability scores across standard corporate pathways</p>
              
              {(() => {
                const iq = data.averages.IQ || 0;
                const eq = data.averages.EQ || 0;
                const sq = data.averages.SQ || 0;
                const aq = data.averages.AQ || 0;
                const spq = data.averages.SpQ || 0;

                const sectors = [
                  { name: "Tech Roles (Software / Systems)", fit: iq * 0.40 + aq * 0.30 + eq * 0.20 + sq * 0.05 + spq * 0.05, desc: "High problem solving and adaptability requirements", color: "from-cyan-500 to-blue-500" },
                  { name: "Sales & BD Roles (Client/growth)", fit: iq * 0.10 + aq * 0.20 + eq * 0.35 + sq * 0.35 + spq * 0.00, desc: "High emotional and social resonance focus", color: "from-purple-500 to-indigo-500" },
                  { name: "Ops & Logistics (Execution/Scale)", fit: iq * 0.30 + aq * 0.25 + eq * 0.25 + sq * 0.15 + spq * 0.05, desc: "Balanced cognitive and process organization requirements", color: "from-emerald-500 to-teal-500" },
                  { name: "Leadership & Management (Trainee)", fit: iq * 0.20 + aq * 0.20 + eq * 0.30 + sq * 0.25 + spq * 0.05, desc: "High communication, resilience, and vision focus", color: "from-amber-500 to-orange-500" }
                ];

                return (
                  <div className="space-y-6">
                    {sectors.map((sec) => (
                      <div key={sec.name} className="space-y-2">
                        <div className="flex justify-between items-baseline font-mono text-sm">
                          <span className="text-white font-bold">{sec.name}</span>
                          <span className="text-[#8aebff] font-extrabold">{sec.fit.toFixed(1)}% Suitability</span>
                        </div>
                        <div className="h-3 w-full bg-[#1a2122] rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${sec.color} rounded-full`}
                            style={{ width: `${sec.fit}%` }}
                          ></div>
                        </div>
                        <p className="text-[11px] text-[#bbc9cd]/70 leading-tight">{sec.desc}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Cognitive vs Emotional Balance Grid */}
            <div className="bg-[#0f172a]/40 backdrop-blur-md p-8 border border-white/10 rounded-xl">
              <h3 className="text-2xl font-bold text-white mb-2">Cognitive & Emotional Balance Grid</h3>
              <p className="text-[#bbc9cd] text-sm mb-6">Distribution matrix classification based on IQ vs EQ metrics</p>
              
              {(() => {
                const iq = data.averages.IQ || 0;
                const eq = data.averages.EQ || 0;
                
                const executorPercent = Math.round((iq / 100) * (eq / 100) * 100);
                const specialistPercent = Math.round((iq / 100) * (1 - eq / 100) * 100);
                const builderPercent = Math.round((1 - iq / 100) * (eq / 100) * 100);
                const supportPercent = Math.max(0, 100 - executorPercent - specialistPercent - builderPercent);

                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 border border-[#8aebff]/20 rounded-lg p-5 flex flex-col justify-between h-36 hover:border-[#8aebff]/50 transition-colors">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#8aebff] block mb-1">HIGH IQ / HIGH EQ</span>
                        <span className="text-sm font-bold text-white leading-tight block">Balanced Executors</span>
                      </div>
                      <div className="flex justify-between items-baseline mt-4">
                        <span className="text-xs text-[#bbc9cd]/60">Cohort Share</span>
                        <span className="text-3xl font-black text-white font-mono">{executorPercent}%</span>
                      </div>
                    </div>

                    <div className="bg-black/30 border border-[#c3c0ff]/20 rounded-lg p-5 flex flex-col justify-between h-36 hover:border-[#c3c0ff]/50 transition-colors">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#c3c0ff] block mb-1">HIGH IQ / LOW EQ</span>
                        <span className="text-sm font-bold text-white leading-tight block">Technical Specialists</span>
                      </div>
                      <div className="flex justify-between items-baseline mt-4">
                        <span className="text-xs text-[#bbc9cd]/60">Cohort Share</span>
                        <span className="text-3xl font-black text-white font-mono">{specialistPercent}%</span>
                      </div>
                    </div>

                    <div className="bg-black/30 border border-[#ffd6a3]/20 rounded-lg p-5 flex flex-col justify-between h-36 hover:border-[#ffd6a3]/50 transition-colors">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#ffd6a3] block mb-1">LOW IQ / HIGH EQ</span>
                        <span className="text-sm font-bold text-white leading-tight block">Relationship Builders</span>
                      </div>
                      <div className="flex justify-between items-baseline mt-4">
                        <span className="text-xs text-[#bbc9cd]/60">Cohort Share</span>
                        <span className="text-3xl font-black text-white font-mono">{builderPercent}%</span>
                      </div>
                    </div>

                    <div className="bg-black/30 border border-[#ffb4ab]/20 rounded-lg p-5 flex flex-col justify-between h-36 hover:border-[#ffb4ab]/50 transition-colors">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#ffb4ab] block mb-1">LOW IQ / LOW EQ</span>
                        <span className="text-sm font-bold text-white leading-tight block">Supported Talents</span>
                      </div>
                      <div className="flex justify-between items-baseline mt-4">
                        <span className="text-xs text-[#bbc9cd]/60">Cohort Share</span>
                        <span className="text-3xl font-black text-white font-mono">{supportPercent}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* National Benchmarks Widget */}
          <section className="mb-12">
            <div className="bg-[#0f172a]/40 backdrop-blur-md p-8 border border-white/10 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8aebff]/5 blur-3xl rounded-full"></div>
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <ShieldCheck className="text-[#8aebff]" /> National Benchmarks Comparison
                </h3>
                <p className="text-[#bbc9cd] text-sm mt-1">Comparing college cohort averages to national industry norms</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {[
                  { name: "Cognitive Quotient (IQ)", key: "IQ", norm: 75, color: "#8aebff" },
                  { name: "Emotional Quotient (EQ)", key: "EQ", norm: 70, color: "#c3c0ff" },
                  { name: "Social Quotient (SQ)", key: "SQ", norm: 68, color: "#ffd6a3" },
                  { name: "Adversity Quotient (AQ)", key: "AQ", norm: 65, color: "#ffb4ab" },
                  { name: "Spiritual Quotient (SpQ)", key: "SpQ", norm: 60, color: "#38bdf8" },
                ].map((item) => {
                  const cohortScore = data.averages[item.key as keyof typeof data.averages] || 0;
                  const delta = cohortScore - item.norm;
                  const isPositive = delta >= 0;

                  return (
                    <div key={item.key} className="bg-black/20 p-6 border border-white/5 rounded-lg hover:border-white/10 transition-all">
                      <span className="block text-xs font-bold text-[#bbc9cd] uppercase tracking-wider font-mono mb-2">{item.name}</span>
                      
                      <div className="flex justify-between items-baseline mb-4">
                        <div>
                          <span className="text-3xl font-bold text-white font-mono">{cohortScore.toFixed(1)}</span>
                          <span className="text-xs text-[#bbc9cd] font-mono">/100</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {isPositive ? `▲ +${delta.toFixed(1)}` : `▼ ${delta.toFixed(1)}`}
                        </span>
                      </div>

                      {/* Bar Visualization */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-[9px] text-[#bbc9cd] font-mono mb-1">
                            <span>COHORT</span>
                            <span>{cohortScore.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#1a2122] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${cohortScore}%`, backgroundColor: item.color }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[9px] text-[#bbc9cd]/60 font-mono mb-1">
                            <span>NATIONAL NORM</span>
                            <span>{item.norm}%</span>
                          </div>
                          <div className="h-1 w-full bg-[#1a2122] rounded-full overflow-hidden">
                            <div className="h-full bg-white/20 rounded-full" style={{ width: `${item.norm}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Bottom: Intervention Feed */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12">
              <button 
                className="w-full flex items-center justify-between mb-4 group p-2 hover:bg-white/5 transition-colors rounded"
                onClick={() => setInterventionCollapsed(!interventionCollapsed)}
              >
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <ShieldAlert className={`text-[#ffb4ab] transition-transform ${interventionCollapsed ? '-rotate-90' : ''}`} />
                  Intervention Required
                </h3>
                <div className="flex items-center gap-4">
                  <span className={`bg-[#93000a] text-[#ffdad6] border border-[#ffdad6]/20 px-3 py-1 text-xs font-bold uppercase font-mono`}>3 Critical Alerts</span>
                  <ChevronDown className={`text-[#bbc9cd] transition-transform ${interventionCollapsed ? '-rotate-90' : ''}`} />
                </div>
              </button>

              {!interventionCollapsed && (
                <div className="space-y-3 transition-all">
                  {data.support_needs.map((need: string, idx: number) => {
                    const isCritical = need.includes("Critical") || need.includes("Batch");
                    return (
                      <div key={idx} className="bg-[#161d1e] border-l-4 border-[#ffb4ab] p-6 flex flex-col md:flex-row items-center justify-between gap-6 group hover:bg-[#1a2122] transition-all rounded-r-lg">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className="w-12 h-12 bg-[#ffb4ab]/10 flex items-center justify-center border border-[#ffb4ab]/20 rounded shrink-0">
                            <TrendingDown className="text-[#ffb4ab] w-6 h-6" />
                          </div>
                          <div>
                            <h4 className={`text-white font-bold font-mono`}>{need.split(' - ')[0]}</h4>
                            <p className="text-sm text-[#bbc9cd] mt-1">{need.split(' - ')[1] || "Automated risk vector detection identifies potential dropout pattern."}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                            <span className={`block text-[10px] text-[#bbc9cd] uppercase tracking-widest font-bold font-mono`}>Priority Level</span>
                            <span className={`font-bold font-mono ${isCritical ? 'text-[#ffb4ab]' : 'text-[#ffd6a3]'}`}>{isCritical ? 'CRITICAL' : 'ELEVATED'}</span>
                          </div>
                          <button className={`px-4 py-2 font-bold text-[11px] tracking-[0.1em] rounded transition-all active:scale-95 ${isCritical ? 'bg-[#ffb4ab] text-[#690005] hover:brightness-110' : 'border border-[#ffd6a3]/40 text-[#ffd6a3] hover:bg-[#ffd6a3]/10'}`}>
                            {isCritical ? 'SCHEDULE INTERVENTION' : 'VIEW DOSSIER'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Placement Funnel (Bento) */}
            <div className="md:col-span-5 bg-[#0f172a]/40 backdrop-blur-md p-6 border border-white/10 rounded-xl">
              <h3 className="text-xl font-bold text-white mb-6">Placement Funnel</h3>
              <div className="space-y-6">
                <div className="relative pl-8 border-l-2 border-[#8aebff]/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#8aebff] shadow-[0_0_15px_rgba(47,217,244,0.5)]"></div>
                  <div className="flex justify-between items-center">
                    <span className={`text-white font-bold text-xs font-mono`}>Assessment</span>
                    <span className={`text-[#8aebff] font-bold font-mono`}>4,282</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1a2122] mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#8aebff]" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div className="relative pl-8 border-l-2 border-[#8aebff]/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#8aebff]/60"></div>
                  <div className="flex justify-between items-center">
                    <span className={`text-white font-bold text-xs font-mono`}>Shortlisted</span>
                    <span className={`text-[#8aebff] font-bold font-mono`}>1,840</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1a2122] mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#8aebff]/60" style={{ width: '43%' }}></div>
                  </div>
                </div>
                <div className="relative pl-8 border-l-2 border-[#8aebff]/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#c3c0ff]"></div>
                  <div className="flex justify-between items-center">
                    <span className={`text-white font-bold text-xs font-mono`}>Interviewing</span>
                    <span className={`text-[#c3c0ff] font-bold font-mono`}>612</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1a2122] mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#c3c0ff]" style={{ width: '14%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement Pulse */}
            <div className="md:col-span-7 bg-[#0f172a]/40 backdrop-blur-md p-6 border border-white/10 rounded-xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Cohort Engagement Pulse</h3>
                  <p className="text-[#bbc9cd] text-xs mt-1">Daily active participation (Last 30 Days)</p>
                </div>
                <div className="text-right">
                  <span className={`block text-2xl text-[#8aebff] font-bold font-mono`}>88%</span>
                  <span className={`text-[#10b981] text-[10px] font-bold font-mono`}>+4.2% AVG</span>
                </div>
              </div>
              <div className="flex-grow flex items-end gap-1 h-32">
                {[40, 55, 45, 70, 65, 85, 90, 75, 60, 80, 95, 85, 70, 60, 50].map((h, i) => (
                  <div key={i} className="flex-grow bg-[#8aebff]/20 hover:bg-[#8aebff]/40 transition-all rounded-t-sm" style={{ height: `${h}%` }}></div>
                ))}
              </div>
              <div className={`mt-4 flex justify-between text-[10px] font-bold text-[#bbc9cd] uppercase tracking-widest font-mono`}>
                <span>Day 1</span>
                <span>Day 15</span>
                <span>Today</span>
              </div>
            </div>
          </section>
      </main>

      <footer className="mt-12 py-8 border-t border-white/5 bg-[#090f11]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-black tracking-tighter text-[#bbc9cd]">c2c</span>
            <span className={`text-[10px] text-[#bbc9cd] uppercase tracking-[0.2em] font-bold font-mono`}>Enterprise Core v2.4.0</span>
          </div>
          <div className={`flex gap-8 text-[#bbc9cd] text-[10px] font-bold font-mono`}>
            <a className="hover:text-[#8aebff] transition-colors" href="#">SECURITY PROTOCOL</a>
            <a className="hover:text-[#8aebff] transition-colors" href="#">DATA PRIVACY</a>
            <a className="hover:text-[#8aebff] transition-colors" href="#">SYSTEM STATUS: OPERATIONAL</a>
          </div>
        </div>
      </footer>
    </>
  );
}
