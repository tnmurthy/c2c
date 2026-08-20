"use client";

import React from "react";
import { X, HelpCircle } from "lucide-react";

interface FilterSidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  strictFounderFit: boolean;
  setStrictFounderFit: (value: boolean) => void;
  customWeightsMode: boolean;
  setCustomWeightsMode: (value: boolean) => void;
  minAQ: number;
  setMinAQ: (value: number) => void;
  minEQ: number;
  setMinEQ: (value: number) => void;
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
}

export function FilterSidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
  strictFounderFit,
  setStrictFounderFit,
  customWeightsMode,
  setCustomWeightsMode,
  minAQ,
  setMinAQ,
  minEQ,
  setMinEQ,
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
}: FilterSidebarProps) {
  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 flex flex-col w-80 bg-[#1a2122]/95 backdrop-blur-2xl border-r border-white/10 overflow-y-auto shrink-0 transition-transform duration-300 lg:static lg:translate-x-0
      ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Close button for mobile */}
      <div className="flex lg:hidden justify-end p-4 absolute top-2 right-2">
        <button onClick={() => setMobileMenuOpen(false)} className="text-[#bbc9cd] hover:text-white p-1.5 bg-[#1a2122] rounded-md border border-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-6 space-y-12 mt-8 lg:mt-0">
        <div>
          <h2 className="text-2xl font-semibold text-[#8aebff] mb-1">Recruiter Console</h2>
          <p className={`text-[12px] font-bold tracking-[0.1em] text-[#bbc9cd] opacity-70 font-mono`}>ENTERPRISE TIER</p>
        </div>

        {/* Strict Founder Fit Toggle */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className={`text-[12px] font-bold tracking-[0.1em] font-mono`}>Strict Founder Fit</label>
            <button
              className={`w-10 h-5 rounded-full relative transition-colors ${strictFounderFit ? 'bg-[#8aebff]' : 'bg-[#8aebff]/20'}`}
              onClick={() => setStrictFounderFit(!strictFounderFit)}
            >
              <span className={`absolute top-1 w-3 h-3 bg-[#8aebff] rounded-full transition-all ${strictFounderFit ? 'right-1' : 'left-1 bg-white'}`}></span>
            </button>
          </div>
          <p className="text-[11px] text-[#bbc9cd] leading-tight">Prioritize candidates with high adaptability and high-growth potential scores.</p>
        </div>

        {/* Custom Weight Sandbox Toggle */}
        <div className="space-y-4 border-t border-white/5 pt-4">
          <div className="flex justify-between items-center">
            <label className={`text-[12px] font-bold tracking-[0.1em] font-mono text-[#8aebff]`}>Custom Weight Sandbox</label>
            <button
              className={`w-10 h-5 rounded-full relative transition-colors ${customWeightsMode ? 'bg-[#8aebff]' : 'bg-[#8aebff]/20'}`}
              onClick={() => setCustomWeightsMode(!customWeightsMode)}
            >
              <span className={`absolute top-1 w-3 h-3 bg-[#8aebff] rounded-full transition-all ${customWeightsMode ? 'right-1' : 'left-1 bg-white'}`}></span>
            </button>
          </div>
          <p className="text-[11px] text-[#bbc9cd] leading-tight">Define custom quotients scoring weights to re-rank candidates in real-time.</p>
        </div>

        {/* Sliders */}
        <div className="space-y-6">
          {customWeightsMode ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>IQ WEIGHT</label>
                  <span className="text-[#8aebff] font-bold font-mono text-sm">{wIQ}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={wIQ}
                  onChange={(e) => setWIQ(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8aebff] cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>AQ WEIGHT</label>
                  <span className="text-[#8aebff] font-bold font-mono text-sm">{wAQ}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={wAQ}
                  onChange={(e) => setWAQ(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8aebff] cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>EQ WEIGHT</label>
                  <span className="text-[#c3c0ff] font-bold font-mono text-sm">{wEQ}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={wEQ}
                  onChange={(e) => setWEQ(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c3c0ff] cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>SQ WEIGHT</label>
                  <span className="text-[#ffd6a3] font-bold font-mono text-sm">{wSQ}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={wSQ}
                  onChange={(e) => setWSQ(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ffd6a3] cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>SpQ WEIGHT</label>
                  <span className="text-[#ffb4ab] font-bold font-mono text-sm">{wSpQ}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={wSpQ}
                  onChange={(e) => setWSpQ(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ffb4ab] cursor-pointer"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>MINIMUM AQ</label>
                  <span className="text-[#8aebff] font-bold font-mono text-xl">{minAQ}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={minAQ}
                  onChange={(e) => setMinAQ(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8aebff] cursor-pointer"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>MINIMUM EQ</label>
                  <span className="text-[#c3c0ff] font-bold font-mono text-xl">{minEQ}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={minEQ}
                  onChange={(e) => setMinEQ(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c3c0ff] cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-white/5">
        <div className="flex items-center gap-3 text-[#bbc9cd] hover:text-white transition-colors cursor-pointer group">
          <HelpCircle className="w-4 h-4 group-hover:text-[#8aebff] transition-colors" />
          <span className="text-sm font-medium">Recruitment Guide</span>
        </div>
      </div>
    </aside>
  );
}
