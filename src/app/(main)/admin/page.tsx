"use client";

import { Users, Activity, CheckCircle2, AlertCircle, Server, Radio, Database } from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { Lead } from "@/types";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatCard } from "@/components/StatCard";

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
  const { user, loading: authLoading } = useRequireAuth({ requiredDomain: "@taliatech.in" });
  const { data: leadsData, loading: leadsLoading, error: leadsError } = useApiQuery<Lead[]>(authLoading ? null : "/api/leads");
  const { data: analysisData, loading: analysisLoading, error: analysisError } = useApiQuery<ItemAnalysis[]>(authLoading ? null : "/api/admin/item-analysis");
  
  const leads = leadsData || [];
  const analysis = analysisData || [];

  if (authLoading) {
    return <LoadingScreen title="Verifying Identity" subtitle="Secure_Auth_v2.4" />;
  }

  const hardCount = analysis.filter(a => a.status === 'Too Hard').length;
  const easyCount = analysis.filter(a => a.status === 'Too Easy').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 dark pb-24">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
