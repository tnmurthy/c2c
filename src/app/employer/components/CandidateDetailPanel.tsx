"use client";

import React from "react";
import type { Candidate } from "@/types";
import { X, MoreVertical, Zap, CheckCircle, Plus, Download } from "lucide-react";

interface CandidateDetailPanelProps {
  selectedCandidate: Candidate | null;
  panelVisible: boolean;
  togglePanel: (candidate?: Candidate) => void;
  customWeightsMode: boolean;
  sortBy: 'match' | 'tech' | 'sales';
  wIQ: number;
  wAQ: number;
  wEQ: number;
  wSQ: number;
  wSpQ: number;
  handlePrintDossier: () => void;
}

export function CandidateDetailPanel({
  selectedCandidate,
  panelVisible,
  togglePanel,
  customWeightsMode,
  sortBy,
  wIQ,
  wAQ,
  wEQ,
  wSQ,
  wSpQ,
  handlePrintDossier,
}: CandidateDetailPanelProps) {
  return (
    <div
      className={`absolute top-0 right-0 w-full md:w-[480px] h-full bg-[#242b2d]/95 backdrop-blur-3xl z-40 border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-500 ease-in-out ${panelVisible ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {selectedCandidate && (
        <>
          <div className="p-6 flex justify-between items-center border-b border-white/5">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors" onClick={() => togglePanel()}>
              <X className="w-5 h-5" />
            </button>
            <span className={`text-[12px] font-bold tracking-[0.1em] text-[#8aebff] font-mono`}>CANDIDATE DOSSIER</span>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
              <MoreVertical className="w-5 h-5 text-[#bbc9cd]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full border-2 border-[#8aebff]/50 p-1 mb-4 shadow-[0_0_20px_rgba(47,217,244,0.3)]">
                <img alt={selectedCandidate.name} className="w-full h-full rounded-full object-cover" src={selectedCandidate.image}/>
              </div>
              <h2 className="text-3xl font-extrabold text-[#dde4e5]">{selectedCandidate.name}</h2>
              <p className={`text-[#8aebff] text-sm font-medium tracking-[0.05em] font-mono`}>Elite Candidate #{selectedCandidate.id} • Tier 1</p>
            </div>

            <div className="space-y-4">
              <h4 className={`text-[12px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>Professional Legend</h4>
              <div className="bg-[#0f172a]/40 backdrop-blur-md p-4 rounded-lg text-sm text-[#dde4e5] leading-relaxed border-l-2 border-[#8aebff] border-white/5">
                &ldquo;{selectedCandidate.summary}&rdquo;
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0f172a]/40 backdrop-blur-md p-4 rounded-lg border border-white/5 text-center">
                <p className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] mb-1 font-mono`}>TECH FIT INDEX</p>
                <p className="text-2xl font-bold text-[#8aebff]">{selectedCandidate.tech_fit_index?.toFixed(1)}</p>
              </div>
              <div className="bg-[#0f172a]/40 backdrop-blur-md p-4 rounded-lg border border-white/5 text-center">
                <p className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] mb-1 font-mono`}>SALES FIT INDEX</p>
                <p className="text-2xl font-bold text-[#c3c0ff]">{selectedCandidate.sales_fit_index?.toFixed(1)}</p>
              </div>
              <div className="bg-[#0f172a]/40 backdrop-blur-md p-4 rounded-lg border border-white/5 text-center">
                <p className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] mb-1 font-mono`}>AQ SCORE</p>
                <p className="text-2xl font-bold text-[#dde4e5]">{selectedCandidate.aq}</p>
              </div>
              <div className="bg-[#0f172a]/40 backdrop-blur-md p-4 rounded-lg border border-white/5 text-center">
                <p className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] mb-1 font-mono`}>IQ SCORE</p>
                <p className="text-2xl font-bold text-[#dde4e5]">{selectedCandidate.iq}</p>
              </div>
            </div>

            {/* Dimension Fit Matrix */}
            <div className="space-y-4">
              <h4 className="text-[12px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono">Dimension Fit Matrix</h4>
              <div className="bg-[#0f172a]/20 border border-white/5 rounded-lg p-5 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-white/40 uppercase tracking-widest font-mono">
                    Weight Model: {customWeightsMode ? 'CUSTOM SANDBOX' : sortBy === 'sales' ? 'SALES FIT' : 'TECH FIT'}
                  </span>
                </div>

                {(() => {
                  const totalW = wIQ + wAQ + wEQ + wSQ + wSpQ;
                  const activeWeights = customWeightsMode
                    ? {
                        IQ: totalW > 0 ? wIQ / totalW : 0,
                        AQ: totalW > 0 ? wAQ / totalW : 0,
                        EQ: totalW > 0 ? wEQ / totalW : 0,
                        SQ: totalW > 0 ? wSQ / totalW : 0,
                        SpQ: totalW > 0 ? wSpQ / totalW : 0
                      }
                    : sortBy === 'sales'
                      ? { IQ: 0.10, AQ: 0.20, EQ: 0.35, SQ: 0.35, SpQ: 0.00 }
                      : { IQ: 0.40, AQ: 0.30, EQ: 0.20, SQ: 0.05, SpQ: 0.05 };

                  const dimScores = {
                    IQ: selectedCandidate.iq,
                    EQ: selectedCandidate.eq,
                    AQ: selectedCandidate.aq,
                    SQ: selectedCandidate.sq,
                    SpQ: Math.round((selectedCandidate.iq + selectedCandidate.eq) / 2)
                  };

                  return Object.entries(activeWeights).map(([dim, weight]) => {
                    const rawScore = (dimScores as any)[dim] || 0;
                    const contribution = rawScore * weight;
                    const maxContrib = 100 * weight;
                    const fillPercent = maxContrib > 0 ? (contribution / maxContrib) * 100 : 0;

                    return (
                      <div key={dim} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white font-bold">{dim} ({Math.round(weight * 100)}%)</span>
                          <span className="text-[#8aebff] font-bold">{rawScore} pts &rarr; +{contribution.toFixed(1)} match pts</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                            style={{ width: `${fillPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className={`text-[12px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>Verified Skills</h4>
                <span className="text-[10px] text-[#8aebff] bg-[#8aebff]/10 px-2 py-0.5 rounded border border-[#8aebff]/20">Trust Level: HIGH</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/10">
                  <span className="text-sm">Infrastructure Security</span>
                  <CheckCircle className="w-4 h-4 text-[#8aebff] group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex justify-between items-center p-3 rounded hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/10">
                  <span className="text-sm">Reactive Systems</span>
                  <CheckCircle className="w-4 h-4 text-[#8aebff] group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex justify-between items-center p-3 rounded hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/10">
                  <span className="text-sm">Team Leadership</span>
                  <CheckCircle className="w-4 h-4 text-[#8aebff] group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-white/5 bg-[#2f3638]/50 space-y-3">
            <button className="w-full bg-[#8aebff] text-[#00363e] py-6 text-[12px] font-bold tracking-[0.1em] rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(47,217,244,0.3)] flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 fill-[#00363e]" />
              REQUEST INTRODUCTION
            </button>
            <button className="w-full border border-white/10 text-[#dde4e5] py-4 text-[12px] font-bold tracking-[0.1em] rounded hover:bg-white/5 transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              SAVE TO TALENT POOL
            </button>
            <button
              onClick={handlePrintDossier}
              className="w-full border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 py-4 text-[12px] font-bold tracking-[0.1em] rounded transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              EXPORT DOSSIER (PDF)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
