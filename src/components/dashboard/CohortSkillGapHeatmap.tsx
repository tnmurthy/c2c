"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingDown,
  Target,
  BookOpen,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  Flame,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export interface SkillGapItem {
  skill: string;
  market_demand_jobs: number;
  market_demand_pct: number;
  cohort_supply_students: number;
  cohort_supply_pct: number;
  cohort_missing_pct: number;
  priority_score: number;
  severity: "Critical" | "Moderate" | "Low";
  learning_resource: {
    platform: string;
    url: string;
    est_hours: string;
  };
}

export interface SkillGapReportData {
  cohort_summary: {
    total_students: number;
    total_jobs_analyzed: number;
    unique_market_skills: number;
    top_10_market_readiness_index: number;
  };
  prioritized_gaps: SkillGapItem[];
  recommended_interventions: Array<{
    title: string;
    reason: string;
    recommended_format: string;
    target_skill: string;
  }>;
}

interface CohortSkillGapHeatmapProps {
  institutionId: string;
}

export const CohortSkillGapHeatmap: React.FC<CohortSkillGapHeatmapProps> = ({
  institutionId,
}) => {
  const [data, setData] = useState<SkillGapReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "Critical" | "Moderate">("all");

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch("/api/market/skill-gap-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ institution_id: institutionId }),
        });
        if (!res.ok) throw new Error("Failed to load skill gap telemetry");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error("Skill gap fetch error", err);
        setError("Could not generate skill gap report.");
      } finally {
        setLoading(false);
      }
    };

    if (institutionId) {
      fetchReport();
    }
  }, [institutionId]);

  if (loading) {
    return (
      <div className="bg-[#141b1d] border border-white/10 rounded-2xl p-8 text-center font-mono text-cyan-400 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Compiling Institutional Skill Gap Heatmap vs Market Postings...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#141b1d] border border-white/10 rounded-2xl p-6 font-mono text-xs text-[#bbc9cd]/60">
        Skill Gap Analysis is currently calibrating for this cohort.
      </div>
    );
  }

  const filteredGaps = (data.prioritized_gaps || []).filter((g) => {
    if (selectedFilter === "all") return true;
    return g.severity === selectedFilter;
  });

  const severityBadge = (severity: string) => {
    if (severity === "Critical") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded">
          <Flame className="w-2.5 h-2.5 text-rose-400" /> CRITICAL GAP
        </span>
      );
    }
    if (severity === "Moderate") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> MODERATE GAP
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
        LOW GAP
      </span>
    );
  };

  return (
    <div className="bg-[#141b1d] border border-white/10 rounded-2xl p-8 relative overflow-hidden space-y-8">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
              COHORT_INTELLIGENCE
            </span>
          </div>
          <h2 className="text-2xl font-bold font-mono text-white tracking-tight flex items-center gap-3">
            <Target className="w-6 h-6 text-cyan-400" />
            Market Skill Gap Heatmap
          </h2>
          <p className="text-xs text-[#bbc9cd] mt-0.5">
            Real-time delta between your cohort’s verified skill supply and active recruiter hiring requirements.
          </p>
        </div>

        {/* Readiness Index */}
        <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-4 rounded-xl shrink-0">
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">Top 10 Market Readiness</div>
            <div className="text-2xl font-black font-mono text-cyan-400">
              {data.cohort_summary.top_10_market_readiness_index}%
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <div className="text-[10px] font-mono text-white/40 uppercase">Analyzed Postings</div>
            <div className="text-2xl font-black font-mono text-white">
              {data.cohort_summary.total_jobs_analyzed}
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-white/40 uppercase mr-2">Filter Severity:</span>
          {(["all", "Critical", "Moderate"] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setSelectedFilter(filterKey)}
              className={`px-3 py-1 rounded-lg transition-all capitalize ${
                selectedFilter === filterKey
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-white/5 text-white/40 border border-transparent hover:text-white"
              }`}
            >
              {filterKey === "all" ? "All Gaps" : `${filterKey} Only`}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-white/40">
          Showing {filteredGaps.length} target competencies
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGaps.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold font-mono text-white">{item.skill}</span>
                {severityBadge(item.severity)}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                <div className="p-2 rounded bg-white/5">
                  <span className="text-white/40 block text-[10px] uppercase">Market Demand</span>
                  <span className="text-cyan-400 font-bold">{item.market_demand_pct}%</span>
                  <span className="text-[10px] text-white/30 ml-1">({item.market_demand_jobs} jobs)</span>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <span className="text-white/40 block text-[10px] uppercase">Cohort Supply</span>
                  <span className="text-white font-bold">{item.cohort_supply_pct}%</span>
                  <span className="text-[10px] text-white/30 ml-1">({item.cohort_supply_students} std)</span>
                </div>
              </div>

              {/* Delta Visual Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/40">
                  <span>Supply Gap Delta</span>
                  <span className="text-rose-400 font-bold">{item.cohort_missing_pct}% Missing</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                    style={{ width: `${item.cohort_missing_pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Learning Plan Link */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-white/40 truncate max-w-[150px]">
                {item.learning_resource.platform}
              </span>
              <a
                href={item.learning_resource.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold"
              >
                Study Plan ({item.learning_resource.est_hours}) <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Recommended Institutional Interventions */}
      {data.recommended_interventions && data.recommended_interventions.length > 0 && (
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              TPO Placement Interventions & Bootcamp Directives
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.recommended_interventions.map((int, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">{int.title}</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                    {int.target_skill}
                  </span>
                </div>
                <p className="text-xs text-[#bbc9cd]">{int.reason}</p>
                <p className="text-xs font-mono text-white/60 bg-black/30 p-2.5 rounded border border-white/5">
                  <span className="text-cyan-400 font-bold">Action:</span> {int.recommended_format}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
