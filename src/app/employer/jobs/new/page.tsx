"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Wifi,
  WifiOff,
  Tag,
  X,
  Sparkles,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { authFetch } from "@/lib/authFetch";

const ROLE_TYPES = [
  {
    id: "tech",
    label: "Tech / Engineering",
    icon: "⚙️",
    hint: "IQ & AQ heavy — builders, coders, architects",
    weights: { IQ: 40, AQ: 30, EQ: 20, SQ: 5, SpQ: 5 },
  },
  {
    id: "sales",
    label: "Sales / BD",
    icon: "🤝",
    hint: "EQ & SQ heavy — rainmakers, relationship builders",
    weights: { IQ: 10, AQ: 20, EQ: 35, SQ: 35, SpQ: 0 },
  },
  {
    id: "ops",
    label: "Operations",
    icon: "📋",
    hint: "Balanced — process owners, coordinators",
    weights: { IQ: 30, AQ: 25, EQ: 25, SQ: 15, SpQ: 5 },
  },
  {
    id: "leadership",
    label: "Leadership",
    icon: "🎯",
    hint: "EQ & SQ forward — team leads, managers",
    weights: { IQ: 20, AQ: 20, EQ: 30, SQ: 25, SpQ: 5 },
  },
];

export default function NewJobPage() {
  const router = useRouter();
  const { user } = useRequireAuth({ allowedRoles: ["employer"] });

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    is_remote: false,
    salary_range: "",
    role_type: "tech",
  });
  const [requirements, setRequirements] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback(
    (field: string, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !requirements.includes(trimmed)) {
      setRequirements((prev) => [...prev, trimmed]);
      setTagInput("");
    }
  }, [tagInput, requirements]);

  const removeTag = useCallback((tag: string) => {
    setRequirements((prev) => prev.filter((r) => r !== tag));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!form.title.trim()) { setError("Job title is required."); return; }
      if (!form.description.trim()) { setError("Description is required."); return; }
      if (requirements.length === 0) { setError("Add at least one requirement tag."); return; }

      setSubmitting(true);
      try {
        const res = await authFetch("/api/employer/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, requirements }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `Error ${res.status}`);
        }
        setSuccess(true);
        setTimeout(() => router.push("/employer"), 1500);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Submission failed");
      } finally {
        setSubmitting(false);
      }
    },
    [form, requirements, router]
  );

  const selectedRole = ROLE_TYPES.find((r) => r.id === form.role_type);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1416] text-[#dde4e5]">
      {/* Header */}
      <div className="border-b border-cyan-500/10 bg-[#1a2122]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            id="back-to-employer"
            onClick={() => router.push("/employer")}
            className="flex items-center gap-2 text-[#bbc9cd] hover:text-cyan-400 transition-colors font-mono text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-4 w-px bg-cyan-500/20" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-sm text-cyan-400 tracking-wider">
              NEW JOB POSTING
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        {/* ── FORM ── */}
        <form id="new-job-form" onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <h1 className="text-2xl font-mono font-bold text-[#dde4e5] mb-1">
              Create Job Posting
            </h1>
            <p className="text-[#bbc9cd] text-sm">
              Define the role and our 5Q matching engine will surface the highest-fit candidates automatically.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              Job posted successfully! Redirecting…
            </div>
          )}

          {/* Job Title */}
          <div className="space-y-2">
            <label htmlFor="job-title" className="font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">
              Job Title *
            </label>
            <input
              id="job-title"
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer"
              className="w-full bg-[#1a2122] border border-cyan-500/20 rounded-xl px-4 py-3 text-[#dde4e5] placeholder-[#4a5568] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
            />
          </div>

          {/* Role Type */}
          <div className="space-y-2">
            <label className="font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">
              Role Type *{" "}
              <span className="text-cyan-400/60 normal-case font-sans tracking-normal">
                — weights the 5Q match algorithm
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_TYPES.map((rt) => (
                <button
                  id={`role-type-${rt.id}`}
                  key={rt.id}
                  type="button"
                  onClick={() => handleChange("role_type", rt.id)}
                  className={`relative flex flex-col items-start gap-1 p-4 rounded-xl border transition-all text-left ${
                    form.role_type === rt.id
                      ? "border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                      : "border-cyan-500/10 bg-[#1a2122] hover:border-cyan-500/30 hover:bg-cyan-500/5"
                  }`}
                >
                  <span className="text-lg">{rt.icon}</span>
                  <span className="font-mono text-sm text-[#dde4e5]">{rt.label}</span>
                  <span className="text-xs text-[#bbc9cd]">{rt.hint}</span>
                  {form.role_type === rt.id && (
                    <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-cyan-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="job-description" className="font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">
              Description *
            </label>
            <textarea
              id="job-description"
              rows={5}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe the role, responsibilities, team culture…"
              className="w-full bg-[#1a2122] border border-cyan-500/20 rounded-xl px-4 py-3 text-[#dde4e5] placeholder-[#4a5568] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans resize-none"
            />
          </div>

          {/* Requirements Tags */}
          <div className="space-y-2">
            <label htmlFor="requirements-input" className="font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">
              Requirements *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5568]" />
                <input
                  id="requirements-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. React, Node.js — press Enter"
                  className="w-full bg-[#1a2122] border border-cyan-500/20 rounded-xl pl-10 pr-4 py-3 text-[#dde4e5] placeholder-[#4a5568] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
                />
              </div>
              <button
                id="add-tag-btn"
                type="button"
                onClick={addTag}
                className="px-4 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 hover:bg-cyan-500/20 transition-colors font-mono text-sm"
              >
                Add
              </button>
            </div>
            {requirements.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {requirements.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#c3c0ff]/10 border border-[#c3c0ff]/20 rounded-full text-[#c3c0ff] text-xs font-mono"
                  >
                    {tag}
                    <button
                      type="button"
                      id={`remove-tag-${tag.replace(/\s+/g, "-")}`}
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Location + Remote */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="job-location" className="font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5568]" />
                <input
                  id="job-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="e.g. Bangalore, India"
                  className="w-full bg-[#1a2122] border border-cyan-500/20 rounded-xl pl-10 pr-4 py-3 text-[#dde4e5] placeholder-[#4a5568] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">Work Mode</label>
              <button
                id="remote-toggle"
                type="button"
                onClick={() => handleChange("is_remote", !form.is_remote)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  form.is_remote
                    ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-400"
                    : "border-cyan-500/20 bg-[#1a2122] text-[#bbc9cd]"
                }`}
              >
                <span className="flex items-center gap-2 font-sans">
                  {form.is_remote ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  {form.is_remote ? "Remote Friendly" : "On-site / Hybrid"}
                </span>
                <div className={`w-10 h-5 rounded-full transition-colors relative ${form.is_remote ? "bg-cyan-500" : "bg-[#2d3748]"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_remote ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Salary Range */}
          <div className="space-y-2">
            <label htmlFor="salary-range" className="font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">
              Salary Range
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5568]" />
              <input
                id="salary-range"
                type="text"
                value={form.salary_range}
                onChange={(e) => handleChange("salary_range", e.target.value)}
                placeholder="e.g. ₹8–14 LPA or $80k–$120k"
                className="w-full bg-[#1a2122] border border-cyan-500/20 rounded-xl pl-10 pr-4 py-3 text-[#dde4e5] placeholder-[#4a5568] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            id="submit-job-btn"
            type="submit"
            disabled={submitting || success}
            className="w-full py-4 rounded-xl bg-[#8aebff] text-[#00363e] font-mono font-bold text-sm tracking-wider hover:bg-[#a8f0ff] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(138,235,255,0.2)]"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#00363e] border-t-transparent rounded-full animate-spin" />
                Publishing…
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Published!
              </>
            ) : (
              <>
                <Briefcase className="w-4 h-4" />
                Publish Job Posting
              </>
            )}
          </button>
        </form>

        {/* ── LIVE PREVIEW ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <p className="font-mono text-xs text-[#bbc9cd] tracking-widest uppercase">Live Preview</p>
            <div className="bg-[#1a2122] border border-cyan-500/10 rounded-2xl p-6 space-y-4 shadow-[0_0_40px_rgba(34,211,238,0.04)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#c3c0ff]/10 border border-[#c3c0ff]/20 text-[#c3c0ff]">
                  {selectedRole?.icon} {selectedRole?.label}
                </span>
                {form.is_remote && (
                  <span className="flex items-center gap-1 font-mono text-xs text-cyan-400">
                    <Wifi className="w-3 h-3" /> Remote
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-mono font-bold text-[#dde4e5] leading-tight">
                  {form.title || <span className="text-[#4a5568]">Job title…</span>}
                </h2>
                {form.location && (
                  <p className="flex items-center gap-1 text-sm text-[#bbc9cd] mt-1">
                    <MapPin className="w-3 h-3" /> {form.location}
                  </p>
                )}
              </div>
              {form.salary_range && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <DollarSign className="w-4 h-4" />
                  <span>{form.salary_range}</span>
                </div>
              )}
              {form.description && (
                <p className="text-sm text-[#bbc9cd] leading-relaxed line-clamp-4">{form.description}</p>
              )}
              {requirements.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {requirements.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-cyan-500/10">
                <p className="text-xs text-[#bbc9cd] font-mono">
                  <span className="text-cyan-400">5Q Matching:</span> {selectedRole?.hint}
                </p>
              </div>
            </div>

            {/* Weight bars */}
            <div className="bg-[#0f172a]/60 border border-[#c3c0ff]/10 rounded-xl p-4 space-y-3">
              <p className="font-mono text-xs text-[#c3c0ff] tracking-widest uppercase">Role Weights</p>
              {selectedRole &&
                Object.entries(selectedRole.weights).map(([dim, pct]) => (
                  <div key={dim} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-[#bbc9cd]">{dim}</span>
                      <span className="font-mono text-cyan-400">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1a2122] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-[#c3c0ff] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
