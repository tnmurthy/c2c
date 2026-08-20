"use client";

import React from "react";

interface WeightSandboxPanelProps {
  wIQ: number;
  setWIQ: (value: number) => void;
  wAQ: number;
  setWAQ: (value: number) => void;
  wEQ: number;
  setWEQ: (value: number) => void;
  wSQ: number;
  setWSQ: (value: number) => void;
  wSpQ: number;
  setWSpQ: (value: number) => void;
  setCustomWeightsMode: (value: boolean) => void;
}

export function WeightSandboxPanel({
  wIQ,
  setWIQ,
  wAQ,
  setWAQ,
  wEQ,
  setWEQ,
  wSQ,
  setWSQ,
  wSpQ,
  setWSpQ,
  setCustomWeightsMode,
}: WeightSandboxPanelProps) {
  return (
    <aside className="hidden xl:flex flex-col w-80 bg-[#1a2122]/95 backdrop-blur-2xl border-l border-white/5 p-6 overflow-y-auto shrink-0 space-y-8">
      <div>
        <h3 className="text-lg font-bold text-[#8aebff] font-mono uppercase tracking-wider mb-1">Sandbox Weights</h3>
        <p className="text-[11px] text-[#bbc9cd] leading-tight">Adjust weights to recalculate neural match rankings in real-time.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono">IQ WEIGHT</label>
            <span className="text-[#8aebff] font-bold font-mono text-sm">{wIQ}%</span>
          </div>
          <input
            type="range" min="0" max="100" value={wIQ}
            onChange={(e) => { setWIQ(parseInt(e.target.value)); setCustomWeightsMode(true); }}
            className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8aebff] cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono">AQ WEIGHT</label>
            <span className="text-[#8aebff] font-bold font-mono text-sm">{wAQ}%</span>
          </div>
          <input
            type="range" min="0" max="100" value={wAQ}
            onChange={(e) => { setWAQ(parseInt(e.target.value)); setCustomWeightsMode(true); }}
            className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8aebff] cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono">EQ WEIGHT</label>
            <span className="text-[#c3c0ff] font-bold font-mono text-sm">{wEQ}%</span>
          </div>
          <input
            type="range" min="0" max="100" value={wEQ}
            onChange={(e) => { setWEQ(parseInt(e.target.value)); setCustomWeightsMode(true); }}
            className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c3c0ff] cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono">SQ WEIGHT</label>
            <span className="text-[#ffd6a3] font-bold font-mono text-sm">{wSQ}%</span>
          </div>
          <input
            type="range" min="0" max="100" value={wSQ}
            onChange={(e) => { setWSQ(parseInt(e.target.value)); setCustomWeightsMode(true); }}
            className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ffd6a3] cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono">SpQ WEIGHT</label>
            <span className="text-[#ffb4ab] font-bold font-mono text-sm">{wSpQ}%</span>
          </div>
          <input
            type="range" min="0" max="100" value={wSpQ}
            onChange={(e) => { setWSpQ(parseInt(e.target.value)); setCustomWeightsMode(true); }}
            className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ffb4ab] cursor-pointer"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 space-y-2 text-xs font-mono text-[#bbc9cd]">
        <div className="flex justify-between">
          <span>TOTAL WEIGHTS:</span>
          <span className={wIQ + wAQ + wEQ + wSQ + wSpQ === 100 ? "text-[#8aebff] font-bold" : "text-yellow-400"}>
            {wIQ + wAQ + wEQ + wSQ + wSpQ}%
          </span>
        </div>
        <p className="text-[10px] text-[#bbc9cd]/60 leading-normal">
          For optimal neural calibration, total active weights should sum to exactly 100%.
        </p>
      </div>
    </aside>
  );
}
