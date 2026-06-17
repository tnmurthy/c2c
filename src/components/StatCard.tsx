'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  theme?: 'cyan' | 'purple' | 'emerald' | 'amber';
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  theme = 'cyan',
  loading = false
}: StatCardProps) {
  // Theme color maps
  const colorMap = {
    cyan: {
      border: 'border-cyan-900/30 hover:border-cyan-500/50',
      bg: 'bg-slate-900/50',
      shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.05)] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',
      glow: 'bg-cyan-500/10 group-hover:bg-cyan-500/20',
      iconBorder: 'border-cyan-800 bg-cyan-950/50 text-cyan-400',
      iconShadow: 'shadow-[0_0_10px_rgba(6,182,212,0.2)]',
      text: 'text-cyan-400/70',
      valGlow: 'drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]',
    },
    purple: {
      border: 'border-purple-900/30 hover:border-purple-500/50',
      bg: 'bg-slate-900/50',
      shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.05)] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
      glow: 'bg-purple-500/10 group-hover:bg-purple-500/20',
      iconBorder: 'border-purple-800 bg-purple-950/50 text-purple-400',
      iconShadow: 'shadow-[0_0_10px_rgba(168,85,247,0.2)]',
      text: 'text-purple-400/70',
      valGlow: 'drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]',
    },
    emerald: {
      border: 'border-emerald-900/30 hover:border-emerald-500/50',
      bg: 'bg-slate-900/50',
      shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      glow: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
      iconBorder: 'border-emerald-800 bg-emerald-950/50 text-emerald-400',
      iconShadow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]',
      text: 'text-emerald-400/70',
      valGlow: 'drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]',
    },
    amber: {
      border: 'border-amber-900/30 hover:border-amber-500/50',
      bg: 'bg-slate-900/50',
      shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      glow: 'bg-amber-500/10 group-hover:bg-amber-500/20',
      iconBorder: 'border-amber-800 bg-amber-950/50 text-amber-400',
      iconShadow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      text: 'text-amber-400/70',
      valGlow: 'drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]',
    }
  };

  const currentTheme = colorMap[theme] || colorMap.cyan;

  return (
    <div className={`group relative overflow-hidden rounded-xl border ${currentTheme.border} ${currentTheme.bg} p-6 ${currentTheme.shadow} backdrop-blur-sm transition-all`}>
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${currentTheme.glow} blur-2xl transition-all`} />
      
      <div className="flex items-center">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg border ${currentTheme.iconBorder} ${currentTheme.iconShadow}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-5">
          <p className={`font-mono text-xs font-medium uppercase tracking-wider ${currentTheme.text}`}>{title}</p>
          <p className={`mt-1 font-mono text-3xl font-bold text-slate-50 ${currentTheme.valGlow}`}>
            {loading ? <span className="animate-pulse">...</span> : value}
          </p>
        </div>
      </div>
    </div>
  );
}
