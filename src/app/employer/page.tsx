"use client";

import React, { useState, useEffect } from "react";
import type { Candidate } from "@/types";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { authFetch } from '@/lib/authFetch';
import { getCandidateMatchScore } from "./utils";
import { FilterSidebar } from "./components/FilterSidebar";
import { CandidateGrid } from "./components/CandidateGrid";
import { WeightSandboxPanel } from "./components/WeightSandboxPanel";
import { CandidateDetailPanel } from "./components/CandidateDetailPanel";
import { JobsTab } from "./components/JobsTab";
import { PrintableDossier } from "./components/PrintableDossier";

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

  // Custom Weight Sandbox state
  const [customWeightsMode, setCustomWeightsMode] = useState(false);
  const [wIQ, setWIQ] = useState(40);
  const [wAQ, setWAQ] = useState(30);
  const [wEQ, setWEQ] = useState(20);
  const [wSQ, setWSQ] = useState(5);
  const [wSpQ, setWSpQ] = useState(5);

  const handlePrintDossier = () => {
    if (!selectedCandidate) return;
    window.print();
  };

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
            role: item.role || item.primary_profile || "Software Engineer",
            cohort: item.cohort || "Cohort 2024.1",
            match: Math.round(item.match || item.tech_fit_index || 0),
            iq: item.iq || item.dimension_scores?.IQ || 0,
            eq: item.eq || item.dimension_scores?.EQ || 0,
            aq: item.aq || item.dimension_scores?.AQ || 0,
            sq: item.sq || item.dimension_scores?.SQ || 0,
            tech_fit_index: item.tech_fit_index || 0,
            sales_fit_index: item.sales_fit_index || 0,
            skills: ["Problem Solving", "Adaptability", "Teamwork"],
            image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}`,
            status: idx % 2 === 0 ? "online" : "away",
            summary: item.summary || `A candidate matching the ${item.role || item.primary_profile || "Software Engineer"} profile with strong foundational skills.`
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

  const processedCandidates = candidates.map(c => ({
    ...c,
    match: getCandidateMatchScore(c, customWeightsMode, { wIQ, wAQ, wEQ, wSQ, wSpQ })
  }));

  const filteredCandidates = processedCandidates
    .filter(c => {
      if (c.aq < minAQ) return false;
      if (c.eq < minEQ) return false;
      if (strictFounderFit && (customWeightsMode ? c.match < 80 : (c.tech_fit_index < 80 && c.sales_fit_index < 80))) return false;
      return true;
    })
    .sort((a, b) => {
      if (customWeightsMode) return b.match - a.match;
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
          <FilterSidebar
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            strictFounderFit={strictFounderFit}
            setStrictFounderFit={setStrictFounderFit}
            customWeightsMode={customWeightsMode}
            setCustomWeightsMode={setCustomWeightsMode}
            minAQ={minAQ}
            setMinAQ={setMinAQ}
            minEQ={minEQ}
            setMinEQ={setMinEQ}
            wIQ={wIQ}
            setWIQ={setWIQ}
            wAQ={wAQ}
            setWAQ={setWAQ}
            wEQ={wEQ}
            setWEQ={setWEQ}
            wSQ={wSQ}
            setWSQ={setWSQ}
            wSpQ={wSpQ}
            setWSpQ={setWSpQ}
          />

          <CandidateGrid
            filteredCandidates={filteredCandidates}
            sortBy={sortBy}
            setSortBy={setSortBy}
            setMobileMenuOpen={setMobileMenuOpen}
            togglePanel={togglePanel}
          />

          <WeightSandboxPanel
            wIQ={wIQ}
            setWIQ={setWIQ}
            wAQ={wAQ}
            setWAQ={setWAQ}
            wEQ={wEQ}
            setWEQ={setWEQ}
            wSQ={wSQ}
            setWSQ={setWSQ}
            wSpQ={wSpQ}
            setWSpQ={setWSpQ}
            setCustomWeightsMode={setCustomWeightsMode}
          />

          <CandidateDetailPanel
            selectedCandidate={selectedCandidate}
            panelVisible={panelVisible}
            togglePanel={togglePanel}
            customWeightsMode={customWeightsMode}
            sortBy={sortBy}
            wIQ={wIQ}
            wAQ={wAQ}
            wEQ={wEQ}
            wSQ={wSQ}
            wSpQ={wSpQ}
            handlePrintDossier={handlePrintDossier}
          />
        </>
        ) : (
          <JobsTab isLoadingJobs={isLoadingJobs} jobs={jobs} />
        )}
      </main>

      <PrintableDossier selectedCandidate={selectedCandidate} />
    </div>
  );
}
