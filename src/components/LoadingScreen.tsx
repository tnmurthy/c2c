'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  progress?: number;
}

export function LoadingScreen({
  title = 'Synchronizing Interface',
  subtitle = 'Please wait while we establish a secure link...',
  progress
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-[#070b0d] flex items-center justify-center p-6 font-mono overflow-hidden relative">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Cyber Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #06b6d4 1px, transparent 1px),
            linear-gradient(to bottom, #06b6d4 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="w-full max-w-md z-10 text-center flex flex-col items-center">
        <div className="relative mb-8 flex justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/15 w-16 h-16" />
          <div className="relative w-16 h-16 bg-cyan-950/40 border border-cyan-500/30 rounded-full flex items-center justify-center text-cyan-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </div>

        <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase mb-2">
          {title}
        </h2>
        <p className="text-[#bbc9cd]/60 text-xs tracking-widest uppercase mb-6">
          {subtitle}
        </p>

        {progress !== undefined && (
          <div className="w-full bg-slate-900 border border-cyan-900/30 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.6)]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
