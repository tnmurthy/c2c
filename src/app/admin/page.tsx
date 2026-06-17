"use client";

import { Users, Activity, CheckCircle2, AlertCircle, Server, Radio, Database } from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { Lead } from "@/types";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatCard } from "@/components/StatCard";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useRequireAuth({ requiredDomain: "@taliatech.in" });
  const { data: leadsData, loading, error } = useApiQuery<Lead[]>(authLoading ? null : "/api/leads");
  const leads = leadsData || [];

  if (authLoading) {
    return <LoadingScreen title="Verifying Identity" subtitle="Secure_Auth_v2.4" />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 dark">
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
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard title="Active Nodes" value={1} icon={Server} theme="cyan" />
          <StatCard title="Users Verified" value={42} icon={Users} theme="emerald" />
          <StatCard title="Market Entities" value={leads.length} icon={Database} theme="purple" loading={loading} />
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
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Activity className="mb-4 h-8 w-8 animate-pulse text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <p className="font-mono text-xs text-cyan-500/70 uppercase">Establishing connection to databank...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-12 text-red-500">
                <AlertCircle className="mb-3 h-10 w-10 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <p className="font-mono text-sm">ERR_CONNECTION: {error}</p>
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
      </div>
    </div>
  );
}
