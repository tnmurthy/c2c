"use client";

import React from "react";
import type { Candidate } from "@/types";

interface PrintableDossierProps {
  selectedCandidate: Candidate | null;
}

export function PrintableDossier({ selectedCandidate }: PrintableDossierProps) {
  return (
    <>
      {/* Print Stylesheet Overrides */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          body > *:not(#printable-dossier-root) {
            display: none !important;
          }
          #printable-dossier-root {
            display: block !important;
            background-color: white !important;
            color: black !important;
            padding: 40px !important;
          }
        }
      `}</style>

      {selectedCandidate && (
        <div id="printable-dossier-root" className="hidden p-10 font-sans max-w-4xl mx-auto border-2 border-slate-200 rounded-lg">
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">CAMPUS TO CORPORATE (C2C)</h1>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">Elite Talent Behavioral Scorecard</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-mono">Report generated on {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-start gap-8 mb-8">
            <img
              alt={selectedCandidate.name}
              className="w-24 h-24 rounded-full border border-slate-300"
              src={selectedCandidate.image}
            />
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedCandidate.name}</h2>
              <p className="text-md text-slate-600 font-mono mb-2">{selectedCandidate.role} ({selectedCandidate.cohort})</p>
              <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono font-bold text-slate-700">
                Primary Profile Archetype: {selectedCandidate.role}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="border border-slate-200 p-4 rounded text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Match Index</span>
              <span className="text-xl font-bold text-slate-800">{selectedCandidate.match}%</span>
            </div>
            <div className="border border-slate-200 p-4 rounded text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">IQ Score</span>
              <span className="text-xl font-bold text-slate-800">{selectedCandidate.iq}</span>
            </div>
            <div className="border border-slate-200 p-4 rounded text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">EQ Score</span>
              <span className="text-xl font-bold text-slate-800">{selectedCandidate.eq}</span>
            </div>
            <div className="border border-slate-200 p-4 rounded text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">AQ Score</span>
              <span className="text-xl font-bold text-slate-800">{selectedCandidate.aq}</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-900 uppercase font-mono border-b pb-2 mb-3">Professional Dossier Overview</h3>
            <p className="text-sm text-slate-700 leading-relaxed italic">
              "{selectedCandidate.summary}"
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase font-mono border-b pb-2 mb-3">Verified Core Strengths</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCandidate.skills.map((skill, idx) => (
                <span key={idx} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-800 font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
            CONFIDENTIAL RECRUITMENT INSIGHTS // INTENDED ONLY FOR ENTERPRISE SUBSCRIBER RECRUITERS
          </div>
        </div>
      )}
    </>
  );
}
