"use client";

import React from "react";
import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";

interface JobsTabProps {
  isLoadingJobs: boolean;
  jobs: any[];
}

// Stable placeholder "target matches" count derived from the job id, so it
// doesn't change between renders (Math.random() here would also differ
// between server and client render, causing a hydration mismatch).
function placeholderTargetMatches(jobId: string | number): number {
  const str = String(jobId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 20) + 5;
}

export function JobsTab({ isLoadingJobs, jobs }: JobsTabProps) {
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0e1416]">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold font-mono text-white mb-2">Active Job Postings</h2>
            <p className="text-[#bbc9cd] text-sm">Manage your recruitment pipeline and track matching candidates.</p>
          </div>
          <Link
            href="/employer/jobs/new"
            className="bg-cyan-500 hover:bg-cyan-400 text-[#00363e] px-4 py-2 rounded text-sm font-bold font-mono tracking-widest transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            CREATE_NEW_ROLE
          </Link>
        </div>

        {isLoadingJobs ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="border border-white/5 bg-white/5 rounded-lg p-12 text-center">
            <LayoutGrid className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Active Postings</h3>
            <p className="text-[#bbc9cd] text-sm mb-6 max-w-md mx-auto">You haven&apos;t created any job postings yet. Create your first role to start matching with elite candidates.</p>
            <Link
              href="/employer/jobs/new"
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded text-sm font-bold font-mono tracking-widest transition-colors inline-block"
            >
              CREATE_NEW_ROLE
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div key={job.id} className="border border-white/10 bg-[#1a2122]/50 hover:bg-[#1a2122] transition-colors rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{job.title}</h3>
                    <p className="text-cyan-400 text-xs font-mono">{job.department}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${job.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/10 text-white/60'}`}>
                    {job.status}
                  </span>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#bbc9cd]">Location</span>
                    <span className="text-white">{job.location}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#bbc9cd]">Type</span>
                    <span className="text-white capitalize">{job.employment_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#bbc9cd]">Target Matches</span>
                    <span className="text-white font-bold">{placeholderTargetMatches(job.id)}</span>
                  </div>
                </div>
                <button className="w-full bg-white/5 hover:bg-white/10 text-white py-2 rounded text-xs font-bold font-mono tracking-widest transition-colors">
                  VIEW_MATCHES
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
