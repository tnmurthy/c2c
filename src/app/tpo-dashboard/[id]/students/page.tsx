"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Briefcase,
  ArrowUpDown,
  Link as LinkIcon,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/authFetch";

interface Student {
  id: string;
  full_name: string;
  email: string;
  department: string;
  graduation_year: number;
  skills: string[];
  is_verified: boolean;
  resume_url: string | null;
  tech_fit_index: number | null;
  sales_fit_index: number | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const DEPT_COLORS: Record<string, string> = {
  "Computer Science": "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  "Information Technology": "text-[#c3c0ff] bg-[#c3c0ff]/10 border-[#c3c0ff]/20",
  "Electronics": "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  "Mechanical": "text-orange-400 bg-orange-400/10 border-orange-400/20",
  "Civil": "text-green-400 bg-green-400/10 border-green-400/20",
};

function deptColor(dept: string): string {
  return DEPT_COLORS[dept] ?? "text-[#bbc9cd] bg-[#bbc9cd]/10 border-[#bbc9cd]/20";
}

export default function StudentTracking() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ["institution", "admin"] });

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterVerified, setFilterVerified] = useState<"all" | "verified" | "unverified">("all");
  const [sortBy, setSortBy] = useState<"name" | "year" | "dept">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/institution/${id}/cohort`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Student[] = await res.json();
      setStudents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) fetchStudents();
  }, [authLoading, fetchStudents]);

  const handleVerify = useCallback(async (studentId: string) => {
    setVerifying(studentId);
    try {
      const res = await authFetch(`/api/institution/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId }),
      });
      if (!res.ok) throw new Error("Verification failed");
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, is_verified: true } : s))
      );
    } catch {
      // silent fail
    } finally {
      setVerifying(null);
    }
  }, [id]);

  const copyInviteLink = useCallback(() => {
    const link = `${window.location.origin}/onboard?inst_id=${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }, [id]);

  const departments = useMemo(
    () => ["all", ...Array.from(new Set(students.map((s) => s.department).filter(Boolean)))],
    [students]
  );
  const years = useMemo(
    () => ["all", ...Array.from(new Set(students.map((s) => String(s.graduation_year)).filter(Boolean))).sort()],
    [students]
  );

  const filtered = useMemo(() => {
    let result = students.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.department || "").toLowerCase().includes(q) ||
        (s.skills || []).some((sk) => sk.toLowerCase().includes(q));
      const matchDept = filterDept === "all" || s.department === filterDept;
      const matchYear = filterYear === "all" || String(s.graduation_year) === filterYear;
      const matchVerified =
        filterVerified === "all" ||
        (filterVerified === "verified" && s.is_verified) ||
        (filterVerified === "unverified" && !s.is_verified);
      return matchSearch && matchDept && matchYear && matchVerified;
    });

    result.sort((a, b) => {
      let av = "", bv = "";
      if (sortBy === "name") { av = a.full_name; bv = b.full_name; }
      else if (sortBy === "dept") { av = a.department; bv = b.department; }
      else if (sortBy === "year") { av = String(a.graduation_year); bv = String(b.graduation_year); }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return result;
  }, [students, search, filterDept, filterYear, filterVerified, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (col: "name" | "year" | "dept") => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  };

  const stats = useMemo(() => ({
    total: students.length,
    verified: students.filter((s) => s.is_verified).length,
    unverified: students.filter((s) => !s.is_verified).length,
    withResume: students.filter((s) => s.resume_url).length,
  }), [students]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full text-[#dde4e5]">
      {/* Header */}
      <div className="border-b border-cyan-500/10 bg-[#1a2122]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              id="back-to-tpo"
              onClick={() => router.push(`/tpo-dashboard/${id}`)}
              className="flex items-center gap-2 text-[#bbc9cd] hover:text-cyan-400 transition-colors font-mono text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Dashboard
            </button>
            <div className="h-4 w-px bg-cyan-500/20" />
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-sm text-cyan-400 tracking-wider">STUDENT ROSTER</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="copy-invite-link"
              onClick={copyInviteLink}
              className="flex items-center gap-2 font-mono text-xs text-[#bbc9cd] hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30"
            >
              {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <LinkIcon className="w-3 h-3" />}
              {copied ? "Copied!" : "Invite Link"}
            </button>
            <button
              id="refresh-roster"
              onClick={fetchStudents}
              className="font-mono text-xs text-[#bbc9cd] hover:text-cyan-400 transition-colors px-3 py-1.5 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-mono font-bold text-[#dde4e5] mb-1">Student Roster</h1>
          <p className="text-[#bbc9cd] text-sm">Manage, verify, and track your institution's cohort.</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: stats.total, icon: GraduationCap, color: "text-cyan-400" },
            { label: "Verified", value: stats.verified, icon: ShieldCheck, color: "text-green-400" },
            { label: "Pending", value: stats.unverified, icon: ShieldAlert, color: "text-yellow-400" },
            { label: "With Resume", value: stats.withResume, icon: Briefcase, color: "text-[#c3c0ff]" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#1a2122] border border-cyan-500/10 rounded-xl p-4 flex items-center gap-3"
            >
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[#bbc9cd] font-mono">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5568]" />
            <input
              id="roster-search"
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, skill…"
              className="w-full bg-[#1a2122] border border-cyan-500/20 rounded-xl pl-10 pr-4 py-2.5 text-[#dde4e5] placeholder-[#4a5568] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans text-sm"
            />
          </div>
          <select
            id="filter-dept"
            value={filterDept}
            onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
            className="bg-[#1a2122] border border-cyan-500/20 rounded-xl px-4 py-2.5 text-[#dde4e5] focus:outline-none focus:border-cyan-500/60 transition-all font-mono text-sm"
          >
            {departments.map((d) => <option key={d} value={d}>{d === "all" ? "All Depts" : d}</option>)}
          </select>
          <select
            id="filter-year"
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
            className="bg-[#1a2122] border border-cyan-500/20 rounded-xl px-4 py-2.5 text-[#dde4e5] focus:outline-none focus:border-cyan-500/60 transition-all font-mono text-sm"
          >
            {years.map((y) => <option key={y} value={y}>{y === "all" ? "All Years" : `Class of ${y}`}</option>)}
          </select>
          <select
            id="filter-verified"
            value={filterVerified}
            onChange={(e) => { setFilterVerified(e.target.value as "all" | "verified" | "unverified"); setPage(1); }}
            className="bg-[#1a2122] border border-cyan-500/20 rounded-xl px-4 py-2.5 text-[#dde4e5] focus:outline-none focus:border-cyan-500/60 transition-all font-mono text-sm"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="unverified">Pending</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#1a2122] border border-cyan-500/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-sm text-[#bbc9cd]">Loading cohort…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-400">
              <ShieldAlert className="w-8 h-8" />
              <p className="font-mono text-sm">{error}</p>
              <button onClick={fetchStudents} className="text-xs text-cyan-400 hover:underline font-mono">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#bbc9cd]">
              <Filter className="w-8 h-8" />
              <p className="font-mono text-sm">No students match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-500/10">
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-1 font-mono text-xs text-[#bbc9cd] tracking-widest uppercase hover:text-cyan-400 transition-colors">
                        Name <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => toggleSort("dept")} className="flex items-center gap-1 font-mono text-xs text-[#bbc9cd] tracking-widest uppercase hover:text-cyan-400 transition-colors">
                        Department <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => toggleSort("year")} className="flex items-center gap-1 font-mono text-xs text-[#bbc9cd] tracking-widest uppercase hover:text-cyan-400 transition-colors">
                        Year <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">Skills</th>
                    <th className="px-4 py-3 text-center font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">Status</th>
                    <th className="px-4 py-3 text-center font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((student, idx) => (
                    <tr
                      key={student.id}
                      id={`student-row-${student.id}`}
                      className={`border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-colors ${idx % 2 === 0 ? "" : "bg-[#0e1416]/30"}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-sm text-[#dde4e5] font-medium">{student.full_name}</p>
                          <p className="text-xs text-[#bbc9cd]">{student.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-mono ${deptColor(student.department)}`}>
                          {student.department || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-[#dde4e5]">{student.graduation_year || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(student.skills || []).slice(0, 3).map((sk) => (
                            <span key={sk} className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/15 rounded text-cyan-400 text-[10px] font-mono">
                              {sk}
                            </span>
                          ))}
                          {(student.skills || []).length > 3 && (
                            <span className="text-[10px] text-[#bbc9cd] font-mono">+{student.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {student.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-mono">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-mono">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {!student.is_verified && (
                            <button
                              id={`verify-btn-${student.id}`}
                              onClick={() => handleVerify(student.id)}
                              disabled={verifying === student.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs font-mono hover:bg-green-500/20 transition-all disabled:opacity-50"
                            >
                              {verifying === student.id ? (
                                <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Verify
                            </button>
                          )}
                          {student.resume_url && (
                            <a
                              id={`resume-link-${student.id}`}
                              href={student.resume_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#c3c0ff]/10 border border-[#c3c0ff]/20 rounded-lg text-[#c3c0ff] text-xs font-mono hover:bg-[#c3c0ff]/20 transition-all"
                            >
                              <Download className="w-3 h-3" /> CV
                            </a>
                          )}
                          <a
                            id={`portfolio-link-${student.id}`}
                            href={`/portfolio/${student.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" /> Profile
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-[#bbc9cd]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                id="prev-page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-cyan-500/20 text-[#bbc9cd] hover:text-cyan-400 hover:border-cyan-500/40 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="font-mono text-xs text-[#4a5568] px-1">…</span>
                  ) : (
                    <button
                      key={p}
                      id={`page-${p}`}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-lg font-mono text-xs transition-all ${
                        page === p
                          ? "bg-cyan-500/20 border border-cyan-500/60 text-cyan-400"
                          : "border border-cyan-500/10 text-[#bbc9cd] hover:text-cyan-400 hover:border-cyan-500/30"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                id="next-page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-cyan-500/20 text-[#bbc9cd] hover:text-cyan-400 hover:border-cyan-500/40 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
