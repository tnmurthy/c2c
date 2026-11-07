"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Briefcase, 
  Plus, 
  LayoutGrid, 
  ArrowLeft, 
  Users, 
  MapPin, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { authFetch } from "@/lib/authFetch";
import { signOutEverywhere } from "@/lib/signOut";

interface JobItem {
  id: string;
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  status?: string;
  created_at?: string;
  match_scores?: Record<string, any>;
  description?: string;
}

export default function EmployerJobsListPage() {
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ["employer", "admin"] });
  const router = useRouter();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOutEverywhere();
    router.push("/login");
  };

  useEffect(() => {
    if (authLoading) return;
    const fetchJobs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch("/api/employer/jobs");
        if (res.ok) {
          const data = await res.json();
          setJobs(Array.isArray(data) ? data : []);
        } else {
          setError(`Failed to retrieve job listings (${res.status}).`);
        }
      } catch (err) {
        console.error("Error fetching employer jobs:", err);
        setError("Unable to connect to the backend API.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [authLoading]);

  if (authLoading || isLoading) {
    return <LoadingScreen title="Loading Job Requisitions" subtitle="Synchronizing active employer postings..." />;
  }

  return (
    <div className="bg-[#0e1416] text-[#dde4e5] min-h-screen flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-[#12191b]/80 backdrop-blur">
        <div className="flex items-center gap-8">
          <Link href="/employer" className="text-xl font-bold font-mono tracking-widest text-cyan-400 hover:brightness-110">
            NEURAL_RECRUIT
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/employer" 
              className="text-sm font-mono tracking-widest text-white/40 hover:text-white uppercase transition-colors"
            >
              Discover_Talent
            </Link>
            <span className="text-sm font-mono tracking-widest text-cyan-400 font-bold uppercase border-b-2 border-cyan-400 pb-1">
              My_Job_Postings
            </span>
            <Link 
              href="/wiki" 
              className="text-sm font-mono tracking-widest text-white/40 hover:text-white uppercase transition-colors"
            >
              Architecture_Wiki
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/employer/jobs/new"
            className="bg-cyan-500 hover:bg-cyan-400 text-[#00363e] px-3.5 py-1.5 rounded text-xs font-bold font-mono tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            CREATE_NEW_ROLE
          </Link>
          <button 
            onClick={handleLogout} 
            className="text-white/40 hover:text-white text-xs font-mono uppercase tracking-widest"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Breadcrumb & Title Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                <Link href="/employer" className="hover:text-cyan-400">Employer Console</Link>
                <span>/</span>
                <span className="text-cyan-400">Job Postings</span>
              </div>
              <h2 className="text-2xl font-bold font-mono text-white tracking-tight">Active Job Requisitions</h2>
              <p className="text-[#bbc9cd] text-xs mt-0.5">Manage job openings, view ranked 5Q candidate matches, and execute hiring decisions.</p>
            </div>

            <div className="flex items-center gap-3">
              <Link 
                href="/employer" 
                className="px-3.5 py-2 rounded bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 transition-colors flex items-center gap-1.5 border border-white/5"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Talent Pool
              </Link>
              <Link
                href="/employer/jobs/new"
                className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-[#00363e] text-xs font-bold font-mono tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Post New Role
              </Link>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => window.location.reload()} className="underline font-mono">Retry</button>
            </div>
          )}

          {/* Jobs Listing */}
          {jobs.length === 0 ? (
            <div className="border border-white/5 bg-[#1a2122]/30 rounded-xl p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto mb-4">
                <Briefcase className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-mono">No Active Job Requisitions</h3>
              <p className="text-[#bbc9cd] text-xs mb-6 max-w-md mx-auto leading-relaxed">
                You haven&apos;t posted any job openings yet. Create a requisition to begin automated 5Q matching and deep TypeSafe candidate evaluation.
              </p>
              <Link
                href="/employer/jobs/new"
                className="bg-cyan-500 hover:bg-cyan-400 text-[#00363e] px-6 py-2.5 rounded text-xs font-bold font-mono tracking-wider transition-colors inline-flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                CREATE_YOUR_FIRST_ROLE
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.map((job) => {
                const matchCount = Object.keys(job.match_scores || {}).length;
                return (
                  <div
                    key={job.id}
                    className="border border-white/10 bg-[#1a2122]/40 hover:bg-[#1a2122]/70 hover:border-cyan-500/40 transition-all rounded-xl p-5 flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-xs text-cyan-400 font-mono mt-0.5">
                            {job.department || "General Engineering"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                            job.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {job.status || "active"}
                        </span>
                      </div>

                      {job.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                          {job.description}
                        </p>
                      )}

                      <div className="space-y-1.5 py-3 border-y border-white/5 text-xs text-slate-300 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location:
                          </span>
                          <span className="text-slate-200">{job.location || "Remote / Hybrid"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Type:
                          </span>
                          <span className="text-slate-200 capitalize">{job.employment_type || "Full-Time"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ranked Matches:
                          </span>
                          <span className="text-cyan-400 font-bold">{matchCount} Candidates</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-2">
                      <Link
                        href={`/employer/jobs/${job.id}`}
                        className="w-full text-center bg-cyan-500/10 hover:bg-cyan-500 hover:text-[#00363e] border border-cyan-500/30 text-cyan-300 py-2.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>VIEW_CANDIDATE_MATCHES</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
