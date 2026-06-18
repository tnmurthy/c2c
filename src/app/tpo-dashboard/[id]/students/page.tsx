"use client";

import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { useParams, useRouter } from "next/navigation";
import { 
  Users, Download, CheckCircle2, ChevronDown, Plus, LogOut, Home, 
  LayoutDashboard, Search, Link as LinkIcon, AlertTriangle, ShieldCheck
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/lib/supabase";
import { authFetch } from '@/lib/authFetch';

export default function StudentTracking() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ['institution'] });
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'verified' | 'pending'>('verified');
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/institution/${id}/cohort`);
      if (res.ok) {
        const json = await res.json();
        setStudents(json || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [id, authLoading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/onboard?inst_id=${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleVerify = async (studentId: string) => {
    try {
      const res = await authFetch(`/api/institution/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return <LoadingScreen title="Syncing Pipeline Telemetry" subtitle="Fetching student nodes..." />;
  }

  const verifiedStudents = students.filter(s => s.is_verified);
  const pendingStudents = students.filter(s => !s.is_verified);

  return (
    <div className={`bg-[#0e1416] text-[#dde4e5] font-sans h-screen flex overflow-hidden`}>
      {/* SideNavBar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1a2122]/90 backdrop-blur-2xl border-r border-white/5 h-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#22d3ee]/20 flex items-center justify-center rounded">
              <LayoutDashboard className="text-[#8aebff] w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#8aebff]">TPO Command</h2>
              <p className={`text-[10px] text-[#bbc9cd] opacity-70 font-bold tracking-[0.1em] font-mono`}>ENTERPRISE TIER</p>
            </div>
          </div>

          <nav className="space-y-1">
            <Link href={`/tpo-dashboard/${id}`} className="flex items-center gap-3 text-[#bbc9cd] hover:text-white px-3 py-2 rounded-md group">
              <Home className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              <span className={`text-[12px] font-bold tracking-[0.1em] font-mono`}>Analytics</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 bg-[#22d3ee]/20 text-[#8aebff] border-l-4 border-[#8aebff] px-3 py-2 rounded-md">
              <Users className="w-4 h-4" />
              <span className={`text-[12px] font-bold tracking-[0.1em] font-mono`}>Student Tracking</span>
            </Link>
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-[#bbc9cd] hover:text-white px-3 py-2 transition-colors text-left">
            <LogOut className="w-4 h-4" />
            <span className={`text-[12px] font-bold tracking-[0.1em] font-mono`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div>
            <p className={`text-[#8aebff] text-[12px] font-bold tracking-[0.1em] mb-2 font-mono`}>DATA GRID // STUDENT PIPELINE</p>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Student Tracking</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={copyInviteLink}
              className="bg-[#8aebff]/10 border border-[#8aebff]/40 text-[#8aebff] px-4 py-2 flex items-center gap-2 hover:bg-[#8aebff]/20 transition-all text-[12px] font-bold tracking-[0.1em] rounded"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
              {copied ? "COPIED!" : "INVITE LINK"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          <button 
            onClick={() => setActiveTab('verified')}
            className={`px-6 py-3 font-mono text-[12px] font-bold tracking-widest uppercase transition-all ${
              activeTab === 'verified' 
                ? 'text-[#8aebff] border-b-2 border-[#8aebff] bg-[#8aebff]/5' 
                : 'text-[#bbc9cd] hover:text-white hover:bg-white/5'
            }`}
          >
            Verified Cohort ({verifiedStudents.length})
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-mono text-[12px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${
              activeTab === 'pending' 
                ? 'text-[#ffb4ab] border-b-2 border-[#ffb4ab] bg-[#ffb4ab]/5' 
                : 'text-[#bbc9cd] hover:text-white hover:bg-white/5'
            }`}
          >
            Pending Approval 
            {pendingStudents.length > 0 && (
              <span className="bg-[#ffb4ab] text-[#93000a] px-2 py-0.5 rounded-full text-[10px]">
                {pendingStudents.length}
              </span>
            )}
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#1a2122]/50 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="p-4 text-[10px] font-bold font-mono tracking-widest text-[#bbc9cd] uppercase">Student Name</th>
                <th className="p-4 text-[10px] font-bold font-mono tracking-widest text-[#bbc9cd] uppercase">Email</th>
                <th className="p-4 text-[10px] font-bold font-mono tracking-widest text-[#bbc9cd] uppercase">Profile</th>
                <th className="p-4 text-[10px] font-bold font-mono tracking-widest text-[#bbc9cd] uppercase">Ordeal Status</th>
                <th className="p-4 text-[10px] font-bold font-mono tracking-widest text-[#bbc9cd] uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'verified' ? verifiedStudents : pendingStudents).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#bbc9cd] font-mono text-sm">
                    No students found in this category.
                  </td>
                </tr>
              ) : (
                (activeTab === 'verified' ? verifiedStudents : pendingStudents).map(student => (
                  <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-white">{student.full_name}</td>
                    <td className="p-4 text-sm text-[#bbc9cd]">{student.email}</td>
                    <td className="p-4">
                      {student.resume_url ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                          <AlertTriangle className="w-3 h-3" /> Incomplete
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {student.tech_fit_index ? (
                        <span className="text-[#8aebff] font-mono text-xs font-bold border border-[#8aebff]/30 px-2 py-1 rounded">
                          TF: {student.tech_fit_index} | SF: {student.sales_fit_index}
                        </span>
                      ) : (
                        <span className="text-[#bbc9cd] text-xs">Pending Test</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {activeTab === 'pending' && (
                        <button 
                          onClick={() => handleVerify(student.id)}
                          className="bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/40 border border-[#10b981]/50 px-3 py-1.5 rounded text-[10px] font-bold font-mono tracking-widest transition-all"
                        >
                          VERIFY
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
