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
import { useRequireAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function EmployerPage() {
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ['employer', 'admin'] });
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [strictFounderFit, setStrictFounderFit] = useState(false);
  const [minAQ, setMinAQ] = useState(82);
  const [minEQ, setMinEQ] = useState(75);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'match' | 'tech' | 'sales'>('match');

  useEffect(() => {
    if (authLoading) return;
    const fetchCandidates = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/employer/candidates");
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
    fetchCandidates();
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
    <div className={`bg-[#0e1416] text-[#dde4e5] overflow-hidden font-sans`}>


      <div className="flex h-screen relative">
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
                <div className="flex justify-between items-center">
                  <span className={`text-[12px] font-bold tracking-[0.1em] font-mono`}>Min AQ Score</span>
                  <span className={`text-sm font-medium tracking-[0.05em] text-[#8aebff] font-mono`}>{minAQ}</span>
                </div>
                <input 
                  className="w-full h-1 bg-[#2f3638] rounded-lg appearance-none cursor-pointer accent-[#8aebff]" 
                  type="range" 
                  value={minAQ}
                  onChange={(e) => setMinAQ(parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-[12px] font-bold tracking-[0.1em] font-mono`}>Min EQ Score</span>
                  <span className={`text-sm font-medium tracking-[0.05em] text-[#8aebff] font-mono`}>{minEQ}</span>
                </div>
                <input 
                  className="w-full h-1 bg-[#2f3638] rounded-lg appearance-none cursor-pointer accent-[#8aebff]" 
                  type="range" 
                  value={minEQ}
                  onChange={(e) => setMinEQ(parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Advanced Skill Tags */}
            <div className="space-y-4">
              <span className={`text-[12px] font-bold tracking-[0.1em] font-mono`}>Required Competencies</span>
              <div className="flex flex-wrap gap-1">
                <span className={`px-2 py-1 bg-[#8aebff]/10 text-[#8aebff] text-[10px] font-medium tracking-[0.05em] rounded border border-[#8aebff]/20 font-mono`}>TypeScript</span>
                <span className={`px-2 py-1 bg-white/5 text-[#bbc9cd] text-[10px] font-medium tracking-[0.05em] rounded border border-white/10 font-mono`}>Rust</span>
                <span className={`px-2 py-1 bg-white/5 text-[#bbc9cd] text-[10px] font-medium tracking-[0.05em] rounded border border-white/10 font-mono`}>LLM Fine-tuning</span>
                <span className={`px-2 py-1 bg-white/5 text-[#bbc9cd] text-[10px] font-medium tracking-[0.05em] rounded border border-white/10 font-mono`}>Solidity</span>
              </div>
            </div>

            <button className="w-full bg-[#3626ce] text-[#b3b1ff] py-4 text-[12px] font-bold tracking-[0.1em] rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              POST NEW JOB
            </button>
          </div>
          
          <div className="mt-auto p-6 border-t border-white/5 space-y-2">
            <div className="flex items-center gap-4 text-[#bbc9cd] hover:text-white transition-colors cursor-pointer group">
              <HelpCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className={`text-[12px] font-bold tracking-[0.1em] font-mono`}>Support</span>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-4 text-[#bbc9cd] hover:text-white transition-colors cursor-pointer group text-left">
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <span className={`text-[12px] font-bold tracking-[0.1em] font-mono`}>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-hidden bg-[#0e1416]">
          <div className="relative z-10 h-full p-6 overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2 bg-[#1a2122] rounded-md border border-white/10 text-[#8aebff]"
                    aria-label="Toggle filters menu"
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <Users className="text-[#8aebff] w-6 h-6" />
                  <h1 className="text-3xl font-extrabold text-[#dde4e5] tracking-tight leading-none">Talent Pool</h1>
                </div>
                <p className={`text-[#bbc9cd] text-sm tracking-[0.05em] font-medium font-mono`}>Displaying {filteredCandidates.length} elite matches for "Senior Systems Architect" • Cohort 2024.1</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as 'match' | 'tech' | 'sales')}
                  className="bg-[#1a2122] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#dde4e5] focus:outline-none focus:border-[#8aebff]/50 font-mono cursor-pointer"
                >
                  <option value="match">Rank by AI Match</option>
                  <option value="tech">Rank by Tech Fit</option>
                  <option value="sales">Rank by Sales Fit</option>
                </select>
                <div className="flex items-center bg-[#1a2122] rounded-lg p-1 border border-white/10">
                  <button className="p-2 bg-[#8aebff]/20 text-[#8aebff] rounded-md" aria-label="Grid layout">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-[#bbc9cd] hover:text-[#dde4e5]" aria-label="List layout">
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#0f172a]/40 backdrop-blur-md rounded-lg border border-white/10 text-[#dde4e5] text-sm transition-all hover:border-[#8aebff]/40">
                  <Download className="w-4 h-4" />
                  Export CSV
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-12">
                {filteredCandidates.map((candidate) => (
                  <div 
                    key={candidate.id} 
                    className="bg-[#0f172a]/40 backdrop-blur-md rounded-xl overflow-hidden flex flex-col group border border-white/5 hover:border-[#8aebff]/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(47,217,244,0.1)]"
                  >
                    <div className="p-6 space-y-6 flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-lg border border-[#8aebff]/30 overflow-hidden shrink-0">
                              <img alt={candidate.name} className="w-full h-full object-cover" src={candidate.image}/>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-[#0e1416] rounded-full ${candidate.status === 'online' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-[#dde4e5] leading-tight group-hover:text-[#8aebff] transition-colors">{candidate.name}</h3>
                            <p className={`text-[12px] text-[#bbc9cd] font-medium uppercase tracking-[0.05em] font-mono`}>{candidate.role} • {candidate.cohort}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-[10px] font-medium tracking-[0.05em] text-[#8aebff]/70 mb-0.5 font-mono`}>MATCH</div>
                          <div className="text-2xl font-bold text-[#8aebff]">{candidate.match}%</div>
                        </div>
                      </div>

                      {/* Mini Radar Chart (SVG) */}
                      <div className="flex items-center justify-between gap-4 py-2 border-y border-white/5">
                        <div className="w-24 h-24 shrink-0 relative">
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            <polygon className="stroke-white/10 stroke-[0.5] fill-none" points="50,5 93,30 93,80 50,105 7,80 7,30" transform="scale(0.8) translate(12.5, 12.5)"></polygon>
                            <polygon className="stroke-white/10 stroke-[0.5] fill-none" points="50,25 72,38 72,63 50,75 28,63 28,38" transform="scale(0.8) translate(12.5, 12.5)"></polygon>
                            <polygon className="fill-[#2fd9f4]/30 stroke-[#2fd9f4] stroke-[1.5]" points="50,15 88,35 70,85 40,90 20,40" transform="scale(0.8) translate(12.5, 12.5)"></polygon>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className={`text-[8px] font-medium tracking-[0.05em] text-[#8aebff]/40 font-mono`}>CORE</span>
                          </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
                          <div className="flex flex-col">
                            <span className={`text-[9px] text-[#bbc9cd] font-bold tracking-[0.1em] font-mono`}>TFI (TECH FIT)</span>
                            <span className="text-xs font-bold text-[#dde4e5]">{candidate.tech_fit_index?.toFixed(1)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[9px] text-[#bbc9cd] font-bold tracking-[0.1em] font-mono`}>SFI (SALES FIT)</span>
                            <span className="text-xs font-bold text-[#dde4e5]">{candidate.sales_fit_index?.toFixed(1)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[9px] text-[#bbc9cd] font-bold tracking-[0.1em] font-mono`}>AQ</span>
                            <span className="text-xs font-bold text-[#dde4e5]">{candidate.aq}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[9px] text-[#bbc9cd] font-bold tracking-[0.1em] font-mono`}>EQ</span>
                            <span className="text-xs font-bold text-[#dde4e5]">{candidate.eq}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className={`text-[10px] font-bold tracking-[0.1em] text-[#bbc9cd] font-mono`}>TOP SKILLS</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.map((skill: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-[#3626ce]/20 text-[#c3c0ff] text-[10px] rounded border border-[#c3c0ff]/20">{skill}</span>
                          ))}
                        </div>
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
        </main>
      </div>
    </div>
  );
}
