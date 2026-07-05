'use client';

import React, { useState } from 'react';
import { Search, Download, Star, FileText } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import DataState from '@/components/ui/DataState';
import { CrmCandidate, CrmCandidateScore } from '@/types';

export default function CandidatesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: candidates = [], loading, error } = useSupabaseQuery<CrmCandidate[]>(async () => {
    const res = await authFetch('/api/crm/candidates');
    if (!res.ok) {
      throw new Error('Failed to fetch candidates');
    }
    return res.json();
  }, []);

  const downloadPDF = async (studentId: string, type: 'profile' | 'interview-guide') => {
    try {
      const res = await authFetch(`/api/crm/candidates/${studentId}/pdf/${type}`);
      if (!res.ok) throw new Error(`Failed to generate ${type} PDF`);
      
      // Handle file download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${studentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert(`Error downloading ${type} PDF`);
    }
  };

  const filteredCandidates = (candidates || []).filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.archetype && c.archetype.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.department && c.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold font-jetbrains text-white">Talent Pool</h2>
          <p className="text-slate-400 mt-1">Review candidates and psychometric assessment results.</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shrink-0">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search candidates by name, archetype..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-900/50 border border-slate-800 rounded-xl">
        {loading ? (
          <DataState state="loading" className="h-full py-20" />
        ) : error ? (
          <DataState state="error" message={error instanceof Error ? error.message : String(error)} className="h-full py-20" />
        ) : (
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 sticky top-0">
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Archetype</th>
                <th className="px-6 py-4">5Q Scores</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No candidates found.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map(candidate => (
                  <tr key={candidate.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{candidate.full_name}</div>
                      <div className="text-slate-500 text-xs">{candidate.email}</div>
                    </td>
                    <td className="px-6 py-4">{candidate.department || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {candidate.archetype && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Star className="w-3.5 h-3.5" />
                          {candidate.archetype}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                        {['IQ', 'EQ', 'AQ', 'SQ', 'SpQ'].map(dim => {
                          const val = candidate.scores?.[dim as keyof CrmCandidateScore];
                          if (val === undefined) return null;
                          const isGap = val < 70;
                          return (
                            <div key={dim} className={`px-2 py-1 rounded border ${isGap ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'}`} title={isGap ? 'Gap Identified' : 'Satisfactory'}>
                              {dim}: {val}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => downloadPDF(candidate.id, 'profile')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors text-xs"
                          title="Download Profile Report"
                        >
                          <Download className="w-3.5 h-3.5" /> Profile
                        </button>
                        <button 
                          onClick={() => downloadPDF(candidate.id, 'interview-guide')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded border border-indigo-500/30 transition-colors text-xs"
                          title="Download Custom Interview Guide"
                        >
                          <FileText className="w-3.5 h-3.5" /> Guide
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
