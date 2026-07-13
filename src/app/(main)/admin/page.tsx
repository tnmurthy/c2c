"use client";

import React, { useState } from "react";
import { 
  Users, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Radio, 
  Database,
  Brain,
  Sliders,
  ChevronRight,
  TrendingUp,
  Scale
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { Lead } from "@/types";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatCard } from "@/components/StatCard";
import { authFetch } from '@/lib/authFetch';

interface ItemAnalysis {
  id: string;
  stem: string;
  item_type: string;
  dimension: string;
  attempts: number;
  success_rate: number;
  status: 'Too Easy' | 'Too Hard' | 'Optimal';
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ['admin'] });
  const { data: leadsData, loading: leadsLoading, error: leadsError } = useApiQuery<Lead[]>(authLoading ? null : "/api/leads");
  const { data: analysisData, loading: analysisLoading, error: analysisError } = useApiQuery<ItemAnalysis[]>(authLoading ? null : "/api/admin/item-analysis");
  
  // Debugger state
  const [studentIdInput, setStudentIdInput] = useState("");
  const [jobIdInput, setJobIdInput] = useState("");
  const [debugResult, setDebugResult] = useState<any | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  const leads = leadsData || [];
  const analysis = analysisData || [];

  const handleDebugRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdInput || !jobIdInput) return;
    setDebugLoading(true);
    setDebugError(null);
    setDebugResult(null);
    try {
      const res = await authFetch(`/api/admin/match-debugger?student_id=${studentIdInput.trim()}&job_id=${jobIdInput.trim()}`);
      if (res.ok) {
        setDebugResult(await res.json());
      } else {
        const err = await res.json();
        setDebugError(err.detail || "Failed to calculate match debugger telemetry");
      }
    } catch (err: any) {
      setDebugError(err.message || "Network error");
    } finally {
      setDebugLoading(false);
    }
  };

  if (authLoading) {
    return <LoadingScreen title="Verifying Identity" subtitle="Secure_Auth_v2.4" />;
  }

  const hardCount = analysis.filter(a => a.status === 'Too Hard').length;
  const easyCount = analysis.filter(a => a.status === 'Too Easy').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 dark pb-24 font-sans">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 border-b border-cyan-900/30 pb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 font-mono text-3xl font-black uppercase tracking-tight text-white">
              <Activity className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              Global Admin Root
            </h1>
            <p className="mt-2 font-mono text-sm text-cyan-500/70">
              REAL-TIME PLATFORM METRICS & MARKET INTELLIGENCE
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-cyan-800/50 bg-cyan-950/30 px-4 py-1.5 font-mono text-xs text-cyan-400">
            <Radio className="h-3 w-3 animate-pulse text-cyan-400" />
            <span>SYSTEM_ONLINE</span>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-4">
          <StatCard title="Active Nodes" value={1} icon={Server} theme="cyan" />
          <StatCard title="Market Entities" value={leads.length} icon={Database} theme="purple" loading={leadsLoading} />
          <StatCard title="Psychometric Items" value={analysis.length} icon={Users} theme="emerald" loading={analysisLoading} />
          <StatCard title="Flagged (Hard/Easy)" value={`${hardCount} / ${easyCount}`} icon={AlertCircle} theme="amber" loading={analysisLoading} />
        </div>

        <div className="space-y-12">
          
          {/* Match Engine Debugger Section */}
          <div className="overflow-hidden rounded-xl border border-cyan-900/30 bg-slate-900/50 shadow-[0_0_20px_rgba(6,182,212,0.05)] backdrop-blur-sm p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-900/30 pb-4 mb-6">
              <div>
                <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-cyan-100 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" /> Match Engine Debugger
                </h2>
                <p className="text-xs text-cyan-500/70 font-mono mt-1">Audit placing coefficients and archetype formulas</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded border border-cyan-800/50 bg-cyan-950/30 px-2 py-1 font-mono text-[10px] uppercase text-cyan-400 self-start md:self-auto">
                <Sliders className="h-3 w-3" /> Diagnostic Mode
              </span>
            </div>

            <form onSubmit={handleDebugRun} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-8">
              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold text-cyan-500/70 uppercase">Student UUID</label>
                <input 
                  type="text" 
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full bg-slate-950 border border-cyan-900/40 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold text-cyan-500/70 uppercase">Job Posting UUID</label>
                <input 
                  type="text" 
                  value={jobIdInput}
                  onChange={(e) => setJobIdInput(e.target.value)}
                  placeholder="e.g. c39a51bf-15b5-4a1d-a09c-e300188ef77a"
                  className="w-full bg-slate-950 border border-cyan-900/40 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={debugLoading}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 disabled:text-white/40 text-slate-950 font-bold font-mono text-xs uppercase tracking-widest py-3 px-6 rounded transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {debugLoading ? "Scoring..." : "Run Diagnostics"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            {debugError && (
              <div className="bg-rose-950/20 border border-rose-800/40 rounded-lg p-4 flex items-center gap-3 text-rose-400 font-mono text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>ERROR: {debugError}</span>
              </div>
            )}

            {debugResult && (
              <div className="bg-slate-950/40 border border-cyan-900/20 rounded-xl p-6 space-y-8 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-md font-bold font-mono text-white uppercase tracking-tight">{debugResult.job_title}</h3>
                    <p className="text-xs text-cyan-400/70 font-mono uppercase mt-1">Role Type: {debugResult.role_type} | Archetype: {debugResult.archetype}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Computed Fit Score</span>
                    <span className="text-3xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{debugResult.final_score}%</span>
                  </div>
                </div>

                {/* Mathematical Contributions */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-500" /> Dimension Fit Contributors
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Object.entries(debugResult.contributions).map(([dim, details]: any) => {
                      const percentContribution = Math.round((details.contribution / debugResult.max_possible) * 100);
                      return (
                        <div key={dim} className="bg-slate-900/40 border border-cyan-900/10 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-baseline font-mono">
                            <span className="text-white font-bold">{dim}</span>
                            <span className="text-[10px] text-cyan-400/80">wt: {Math.round(details.weight * 100)}%</span>
                          </div>
                          <div className="flex justify-between items-end font-mono">
                            <div className="text-xl font-black text-white">{details.raw_score}</div>
                            <div className="text-xs text-slate-400">+{details.contribution} pts</div>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-cyan-400"
                              style={{ width: `${details.raw_score}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mathematical Formula and Penalty warning */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" /> Scoring Mechanics Formula
                  </h4>
                  <div className="bg-slate-950 p-4 rounded border border-cyan-900/30 font-mono text-xs leading-relaxed text-cyan-100 overflow-x-auto break-all">
                    <span className="text-white/40">// Formula: Sum(Score * Weight) - Penalty</span>
                    <div className="mt-2 text-sm font-bold text-cyan-400">
                      {debugResult.formula} = {debugResult.final_score}%
                    </div>
                  </div>
                </div>

                {/* Archetype penalty warning */}
                {debugResult.archetype_penalty > 0 && (
                  <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-4 flex gap-3 text-amber-400 font-mono text-xs leading-relaxed">
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                    <div>
                      <span className="font-bold uppercase block mb-1">Archetype Mismatch Penalty Triggered</span>
                      <span>{debugResult.penalty_explanation}</span>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Leads Table */}
          <div className="overflow-hidden rounded-xl border border-cyan-900/30 bg-slate-900/50 shadow-[0_0_20px_rgba(6,182,212,0.05)] backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-cyan-900/30 bg-slate-900/80 px-6 py-4">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-cyan-100">Market Leads Stream</h2>
              <span className="inline-flex items-center gap-1.5 rounded border border-emerald-800/50 bg-emerald-950/30 px-2 py-1 font-mono text-[10px] uppercase text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Live Sync
              </span>
            </div>
            
            <div className="overflow-x-auto">
              {leadsLoading ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <Activity className="mb-4 h-8 w-8 animate-pulse text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <p className="font-mono text-xs text-cyan-500/70 uppercase">Establishing connection to databank...</p>
                </div>
              ) : leadsError ? (
                <div className="flex flex-col items-center justify-center p-12 text-red-500">
                  <AlertCircle className="mb-3 h-10 w-10 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <p className="font-mono text-sm">ERR_CONNECTION: {leadsError}</p>
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                  <Database className="mb-3 h-10 w-10 opacity-50" />
                  <p className="font-mono text-sm">NO_RECORDS_FOUND</p>
                </div>
              ) : (
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-cyan-900/30 bg-slate-950/50">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-500/70">Identifier / Role</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-500/70">Target Vector / Entity</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-cyan-500/70">Confidence Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-900/20">
                    {leads.map((lead, idx) => (
                      <tr key={lead.id || idx} className="group transition-colors hover:bg-cyan-950/20">
                        <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-cyan-100">
                          {lead.job_title || lead.title || 'UNKNOWN_ROLE'}
                        </td>
                        <td className="px-6 py-4 text-slate-400 group-hover:text-cyan-200">
                          {lead.company || lead.company_name || 'UNKNOWN_ENTITY'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center justify-center rounded border border-cyan-800/50 bg-cyan-950/30 px-2 py-1 text-xs font-bold text-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.2)]">
                            {lead.ai_score !== undefined ? lead.ai_score : '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Item Analysis Table */}
          <div className="overflow-hidden rounded-xl border border-cyan-900/30 bg-slate-900/50 shadow-[0_0_20px_rgba(6,182,212,0.05)] backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-cyan-900/30 bg-slate-900/80 px-6 py-4">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-cyan-100">Psychometric Item Analysis</h2>
              <span className="inline-flex items-center gap-1.5 rounded border border-cyan-800/50 bg-cyan-950/30 px-2 py-1 font-mono text-[10px] uppercase text-cyan-400">
                <Activity className="h-3 w-3 animate-pulse" /> Validity Audit
              </span>
            </div>
            
            <div className="overflow-x-auto">
              {analysisLoading ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <Activity className="mb-4 h-8 w-8 animate-pulse text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <p className="font-mono text-xs text-cyan-500/70 uppercase">Generating validity reports...</p>
                </div>
              ) : analysisError ? (
                <div className="flex flex-col items-center justify-center p-12 text-red-500">
                  <AlertCircle className="mb-3 h-10 w-10 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <p className="font-mono text-sm">ERR_VALIDITY_SYNC: {analysisError}</p>
                </div>
              ) : analysis.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                  <Database className="mb-3 h-10 w-10 opacity-50" />
                  <p className="font-mono text-sm">NO_ITEMS_FOUND</p>
                </div>
              ) : (
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-cyan-900/30 bg-slate-950/50">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-500/70">ID</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-500/70">Question Stem</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-500/70">Dimension</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-500/70">Attempts</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-500/70">Success Rate</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-cyan-500/70">Validity Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-900/20">
                    {analysis.map((item, idx) => (
                      <tr key={item.id || idx} className="group transition-colors hover:bg-cyan-950/20">
                        <td className="px-6 py-4 font-mono text-xs text-[#8aebff] group-hover:text-white font-bold">
                          {item.id}
                        </td>
                        <td className="px-6 py-4 text-slate-300 group-hover:text-cyan-100 max-w-xs truncate">
                          {item.stem}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.dimension === 'IQ' ? 'bg-cyan-950/40 text-cyan-400 border-cyan-900/40' :
                            item.dimension === 'EQ' ? 'bg-purple-950/40 text-purple-400 border-purple-900/40' :
                            item.dimension === 'AQ' ? 'bg-rose-950/40 text-rose-400 border-rose-900/40' :
                            item.dimension === 'SQ' ? 'bg-amber-950/40 text-amber-400 border-amber-900/40' :
                            'bg-sky-950/40 text-sky-400 border-sky-900/40'
                          }`}>
                            {item.dimension}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-bold">
                          {item.attempts}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${
                              item.success_rate < 35 ? 'text-rose-400' :
                              item.success_rate > 85 ? 'text-amber-400' :
                              'text-emerald-400'
                            }`}>
                              {item.success_rate}%
                            </span>
                            <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <div className={`h-full rounded-full ${
                                item.success_rate < 35 ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' :
                                item.success_rate > 85 ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' :
                                'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                              }`} style={{ width: `${item.success_rate}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center justify-center rounded px-2.5 py-1 text-xs font-bold ${
                            item.status === 'Optimal' ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.2)]' :
                            item.status === 'Too Easy' ? 'bg-amber-950/30 border border-amber-800/50 text-amber-400 shadow-[0_0_5px_rgba(245,158,11,0.2)]' :
                            'bg-rose-950/30 border border-rose-800/50 text-rose-400 shadow-[0_0_5px_rgba(244,63,94,0.2)]'
                          }`}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
