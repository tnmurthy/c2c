"use client";

import { useParams } from "next/navigation";
import { 
  Trophy, 
  TrendingUp, 
  User, 
  ExternalLink, 
  AlertCircle, 
  Loader2, 
  Share2, 
  Download, 
  ChevronRight,
  Shield,
  Zap,
  Target,
  Brain,
  Layers,
  Activity,
  Cpu,
  Database
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import GrowthRadar from "@/components/charts/GrowthRadar";
import { useRequireAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { DimensionScores, Alert } from "@/types";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    async function fetchData() {
      try {
        const res = await fetch(`/api/student/${id}`);
        if (!res.ok) {
          throw new Error("DASHBOARD_FETCH_ERROR");
        }
        const json = await res.json();
        setData(json);

        try {
          const alertsRes = await fetch(`/api/alerts/student/${id}`);
          if (alertsRes.ok) {
            const alertsJson = await alertsRes.json();
            setAlerts(alertsJson);
          }
        } catch (e) {
          console.error("Alerts fetch error", e);
        }
      } catch (err: unknown) {
        console.error(err);
        // Fallback for demo purposes
        setData({
          student: { full_name: "CYBER_NOMAD", department: "NEURAL_ENGINEERING" },
          assessments: [{
            dimension_scores: { Technical: 88, Product: 94, Leadership: 72, Communication: 91, Adaptability: 76 },
            primary_profile: "THE_ARCHITECT",
            founder_fit: { Builder: 96 },
            development_report: {
              profile_summary: "EXCEPTIONAL_ADAPTIVE_CAPACITY. ANALYTICAL_RIGOR_MATCHED_BY_STRATEGIC_EMPATHY. IDEAL_FOR_HIGH_STAKES_ORCHESTRATION.",
              actionable_feedback: [
                "OPTIMIZE_NEURAL_EFFICIENCY_IN_COGNITIVE_BLINDSPOTS.",
                "LEVERAGE_HIGH_EQ_FOR_STAKEHOLDER_SYNCHRONIZATION.",
                "INTENSIFY_STRESS_TESTING_IN_NON_LINEAR_ENVIRONMENTS."
              ]
            }
          }],
          peer_scores: { Technical: 75, Product: 82, Leadership: 88, Communication: 85, Adaptability: 90 }
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, authLoading]);

  const assessment = data?.assessments?.[0] || {};
  const scores = assessment.dimension_scores || { Technical: 85, Product: 92, Leadership: 78, Communication: 88, Adaptability: 70 };
  const report = assessment.development_report || {};
  const maxFitValue = assessment.founder_fit ? Math.max(...Object.values(assessment.founder_fit as Record<string, number>)) : 96;
  const founderFitType = assessment.founder_fit ? Object.keys(assessment.founder_fit)[0].toUpperCase() : "THE_BUILDER";

  if (authLoading || loading) {
    return <LoadingScreen title="Synchronizing Matrix" subtitle="Establishing Secure Datalink" />;
  }

  return (
    <div className="min-h-screen bg-[#0e1416] text-[#dde4e5] selection:bg-cyan-500/30 selection:text-white pb-24 relative overflow-hidden font-sans">
      {/* Ambient Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/5 blur-[150px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] -z-10 pointer-events-none"></div>



      <main className="max-w-[1500px] mx-auto px-6 pt-12">
        
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
                <p className="max-w-2xl text-lg md:text-2xl text-[#bbc9cd] font-medium leading-relaxed font-sans mt-10 border-l-4 border-cyan-500/30 pl-8">
                  {report.profile_summary}
                </p>
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
                    <h4 className="text-white font-mono font-black uppercase tracking-[0.3em] text-xs mb-4">Legend_Network_Access</h4>
                    <p className="text-[11px] text-[#c3c0ff]/60 uppercase tracking-widest mb-8 leading-relaxed max-w-[200px] mx-auto font-bold">Bridge to verified high-impact opportunities</p>
                    <Link 
                      href="/onboard" 
                      className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)]"
                    >
                      Initialize_Career_Sync <ExternalLink className="w-4 h-4" />
                    </Link>
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
                  {alerts.slice(0, 5).map((alert: any, i: number) => (
                    <a key={i} href={alert.lead_url} target="_blank" rel="noopener noreferrer" className="block group/alert relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400/20 to-indigo-600/20 rounded-xl blur opacity-0 group-hover/alert:opacity-100 transition duration-500"></div>
                      <div className="relative bg-black/60 border border-white/5 p-6 rounded-xl flex flex-col gap-4 backdrop-blur-md transition-all group-hover/alert:bg-black/40 group-hover/alert:translate-x-2">
                        <div className="flex justify-between items-start gap-6">
                          <h3 className="text-[#bbc9cd] font-sans font-black group-hover/alert:text-white transition-colors line-clamp-1 uppercase tracking-tight text-lg">
                            {alert.market_leads?.name || 'High Impact Role'}
                          </h3>
                          <div className="shrink-0 flex flex-col items-end">
                             <div className="font-mono text-[9px] text-cyan-400/40 font-black uppercase tracking-widest mb-1">MATCH</div>
                             <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-sm font-mono text-xs font-black text-cyan-400">
                               {alert.score || alert.market_leads?.ai_score || 0}%
                             </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                          <span className="flex items-center gap-2 font-mono text-[10px] text-white/30 uppercase tracking-widest font-bold">
                             <Database className="w-3.5 h-3.5" /> {alert.market_leads?.company || 'Confidential'}
                          </span>
                          <span className="flex items-center gap-2 text-[10px] font-black font-mono text-cyan-400 uppercase tracking-widest group-hover/alert:translate-x-1 transition-transform">
                             Execute_Link <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
                
                {alerts.length > 5 && (
                  <button className="w-full mt-6 py-4 bg-white/5 border border-white/10 rounded-sm font-mono text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all">
                    Load_More_Matches_({alerts.length - 5})
                  </button>
                )}
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
