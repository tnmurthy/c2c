"use client";

import React from "react";
import type { Candidate } from "@/types";
import { Users, LayoutGrid, List, FileText, Bookmark, MoreVertical, Zap } from "lucide-react";

interface CandidateGridProps {
  filteredCandidates: Candidate[];
  sortBy: 'match' | 'tech' | 'sales';
  setSortBy: (value: 'match' | 'tech' | 'sales') => void;
  setMobileMenuOpen: (open: boolean) => void;
  togglePanel: (candidate?: Candidate) => void;
}

export function CandidateGrid({
  filteredCandidates,
  sortBy,
  setSortBy,
  setMobileMenuOpen,
  togglePanel,
}: CandidateGridProps) {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Top Bar */}
      <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0e1416]/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 mr-4 text-[#bbc9cd] hover:text-white rounded-md hover:bg-white/5"
        >
          <List className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <span className="text-[#bbc9cd] font-mono text-xs">{filteredCandidates.length} CANDIDATES MATCHED</span>
          <div className="h-4 w-px bg-white/10 hidden md:block"></div>
          <select
            className="bg-transparent text-white text-sm font-medium border-none outline-none cursor-pointer hidden md:block"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'match' | 'tech' | 'sales')}
          >
            <option value="match" className="bg-[#1a2122]">Sort by Smart Match</option>
            <option value="tech" className="bg-[#1a2122]">Sort by Tech Fit</option>
            <option value="sales" className="bg-[#1a2122]">Sort by Sales Fit</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors hidden md:flex">
            <LayoutGrid className="w-4 h-4" />
            Grid
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors hidden md:flex">
            <List className="w-4 h-4" />
            List
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded border border-white/10 hover:bg-white/5 transition-colors md:hidden">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Candidate Grid */}
      {filteredCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-white/10 rounded-2xl bg-[#1a2122]/30 backdrop-blur-md text-center max-w-lg mx-auto mt-8">
          <Users className="w-12 h-12 text-[#8aebff]/50 mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-white mb-2">No Candidates Found</h3>
          <p className="text-sm text-[#bbc9cd]">
            No elite talents match the current filter criteria. Adjust the sliders or toggle strict founder fit.
          </p>
        </div>
      ) : (
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto">
          {filteredCandidates.map(candidate => (
            <div
              key={candidate.id}
              onClick={() => togglePanel(candidate)}
              className="bg-[#1a2122]/80 backdrop-blur-md rounded-xl border border-white/5 hover:border-[#8aebff]/30 transition-all cursor-pointer group flex flex-col overflow-hidden hover:shadow-[0_0_30px_rgba(47,217,244,0.05)] hover:-translate-y-1"
            >
              <div className="p-6 flex-1 relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  {candidate.match >= 90 && (
                    <div className="px-2 py-1 rounded bg-[#8aebff]/10 text-[#8aebff] text-[10px] font-bold tracking-wider font-mono flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      TOP MATCH
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className="relative">
                    <img alt={candidate.name} className="w-16 h-16 rounded-full object-cover border border-white/10" src={candidate.image}/>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a2122] ${candidate.status === 'online' ? 'bg-[#8aebff]' : candidate.status === 'away' ? 'bg-[#ffb84d]' : 'bg-[#bbc9cd]'}`}></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#8aebff] transition-colors">{candidate.name}</h3>
                    <p className="text-sm text-[#bbc9cd]">{candidate.role}</p>
                    <p className={`text-[10px] text-[#bbc9cd]/60 font-mono mt-1`}>{candidate.cohort}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-6">
                  <div className="flex flex-col">
                    <span className={`text-[9px] text-[#bbc9cd] font-mono tracking-wider mb-1`}>MATCH</span>
                    <span className="text-lg font-bold text-white">{candidate.match}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[9px] text-[#bbc9cd] font-mono tracking-wider mb-1`}>IQ</span>
                    <span className="text-lg font-bold text-white">{candidate.iq}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[9px] text-[#bbc9cd] font-mono tracking-wider mb-1`}>EQ</span>
                    <span className="text-lg font-bold text-white">{candidate.eq}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[9px] text-[#bbc9cd] font-mono tracking-wider mb-1`}>AQ</span>
                    <span className="text-lg font-bold text-white">{candidate.aq}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 rounded bg-white/5 border border-white/5 text-xs text-[#bbc9cd]">{skill}</span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white/5 border-t border-white/5 flex gap-2">
                <button
                  className="flex-1 bg-[#8aebff] text-[#00363e] text-[11px] font-bold tracking-[0.1em] py-2 rounded hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  onClick={() => togglePanel(candidate)}
                >
                  <FileText className="w-3 h-3" />
                  VIEW DOSSIER
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="w-10 h-9 flex items-center justify-center rounded border border-white/10 hover:bg-white/10 text-[#bbc9cd] transition-colors"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
