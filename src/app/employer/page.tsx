"use client";

import React, { useState, useEffect } from "react";
import type { Candidate } from "@/types";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  LayoutGrid, 
  List, 
  Download, 
  FileText, 
  Bookmark, 
  X, 
  MoreVertical, 
  Zap, 
  HelpCircle, 
  LogOut,
  Plus,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { authFetch } from '@/lib/authFetch';

export default function EmployerPage() {
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ['employer', 'admin'] });
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [strictFounderFit, setStrictFounderFit] = useState(false);
  const [minAQ, setMinAQ] = useState(82);
  const [minEQ, setMinEQ] = useState(75);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'match' | 'tech' | 'sales'>('match');
  const [activeTab, setActiveTab] = useState<'discover' | 'jobs'>('discover');

  useEffect(() => {
    if (authLoading) return;
    const fetchCandidates = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch("/api/employer/candidates");
        if (res.ok) {
          const data = await res.json();
          const mappedData = data.map((item: any, idx: number): Candidate => ({
            id: item.id || `mock-${idx}`,
            name: item.name || "Unknown Candidate",
            role: item.primary_profile || "Software Engineer",
            cohort: "Cohort 2024.1",
            match: Math.round(item.tech_fit_index || 0),
            iq: item.dimension_scores?.IQ || 0,
            eq: item.dimension_scores?.EQ || 0,
            aq: item.dimension_scores?.AQ || 0,
            sq: item.dimension_scores?.SQ || 0,
            tech_fit_index: item.tech_fit_index || 0,
            sales_fit_index: item.sales_fit_index || 0,
            skills: ["Problem Solving", "Adaptability", "Teamwork"],
            image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}`,
            status: idx % 2 === 0 ? "online" : "away",
            summary: `A candidate matching the ${item.primary_profile} profile with strong foundational skills.`
          }));
          setCandidates(mappedData);
        }
      } catch (err) {
        console.error("Failed to fetch candidates:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchJobs = async () => {
      setIsLoadingJobs(true);
      try {
        const res = await authFetch("/api/employer/jobs");
        if (res.ok) {
          setJobs(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    fetchCandidates();
    fetchJobs();
  }, [authLoading]);

  const filteredCandidates = candidates
    .filter(c => {
      if (c.aq < minAQ) return false;
      if (c.eq < minEQ) return false;
      if (strictFounderFit && c.tech_fit_index < 80 && c.sales_fit_index < 80) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'tech') return b.tech_fit_index - a.tech_fit_index;
      if (sortBy === 'sales') return b.sales_fit_index - a.sales_fit_index;
      return b.match - a.match;
    });

  const togglePanel = (candidate?: Candidate) => {
    if (candidate) {
      setSelectedCandidate(candidate);
      setPanelVisible(true);
    } else {
      setPanelVisible(false);
    }
  };

  if (authLoading || isLoading) {
    return <LoadingScreen title="Syncing Recruiter Console" subtitle="Authenticating credentials and loading matches..." />;
  }

  return (
    <div className={`bg-[#0e1416] text-[#dde4e5] h-screen flex flex-col font-sans`}>
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold font-mono tracking-widest text-cyan-400">NEURAL_RECRUIT</h1>
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setActiveTab('discover')}
              className={`text-sm font-mono tracking-widest uppercase transition-colors ${activeTab === 'discover' ? 'text-cyan-400 font-bold' : 'text-white/40 hover:text-white/80'}`}
            >
              Discover_Talent
            </button>
            <button 
              onClick={() => setActiveTab('jobs')}
              className={`text-sm font-mono tracking-widest uppercase transition-colors ${activeTab === 'jobs' ? 'text-cyan-400 font-bold' : 'text-white/40 hover:text-white/80'}`}
            >
              My_Job_Postings
            </button>
            <Link href="#" className="text-sm font-mono tracking-widest text-white/40 hover:text-white/80 uppercase transition-colors">
              Saved_Profiles
            </Link>
          </nav>
        </div>
        <button onClick={handleLogout} className="text-white/40 hover:text-white text-sm font-mono uppercase tracking-widest">Logout</button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {activeTab === 'discover' ? (
        <>
          {/* Left Sidebar: Filters */}
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

              {/* Sliders */}
              <div className="space-y-12">
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
              </div>
            </div>
            
            <div className="mt-auto p-6 border-t border-white/5">
              <div className="flex items-center gap-3 text-[#bbc9cd] hover:text-white transition-colors cursor-pointer group">
                <HelpCircle className="w-4 h-4 group-hover:text-[#8aebff] transition-colors" />
                <span className="text-sm font-medium">Recruitment Guide</span>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
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
                      <button className="w-10 h-9 flex items-center justify-center rounded border border-white/10 hover:bg-white/10 text-[#bbc9cd] transition-colors">
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail View: Sliding Right Panel */}
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
                      "{selectedCandidate.summary}"
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
                <div className="p-6 border-t border-white/5 bg-[#2f3638]/50">
                  <button className="w-full bg-[#8aebff] text-[#00363e] py-6 text-[12px] font-bold tracking-[0.1em] rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(47,217,244,0.3)] mb-3 flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5 fill-[#00363e]" />
                    REQUEST INTRODUCTION
                  </button>
                  <button className="w-full border border-white/10 text-[#dde4e5] py-4 text-[12px] font-bold tracking-[0.1em] rounded hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    SAVE TO TALENT POOL
                  </button>
                </div>
              </>
            )}
          </div>
        </>
        ) : (
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
                <p className="text-[#bbc9cd] text-sm mb-6 max-w-md mx-auto">You haven't created any job postings yet. Create your first role to start matching with elite candidates.</p>
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
                        <span className="text-white font-bold">{Math.floor(Math.random() * 20) + 5}</span>
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
        )}
      </main>
    </div>
  );
}
