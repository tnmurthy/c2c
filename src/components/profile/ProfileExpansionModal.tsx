"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Github,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  X,
  Code2,
  FolderGit2,
  Star,
  Layers,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface ProfileExpansionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Record<string, any>;
  onSkillsUpdated?: (newSkills: string[]) => void;
}

export const ProfileExpansionModal: React.FC<ProfileExpansionModalProps> = ({
  isOpen,
  onClose,
  student,
  onSkillsUpdated,
}) => {
  const [githubInput, setGithubInput] = useState(
    student.github_url || student.github || ""
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleScan = async () => {
    if (!githubInput.trim()) {
      setError("Please enter a GitHub URL or username");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await authFetch("/api/market/expand-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_profile: student,
          github_url: githubInput.trim(),
        }),
      });
      if (!res.ok) throw new Error("Profile expansion scan failed");
      const data = await res.json();
      setResult(data);
      setSelectedSkills(data.new_skills_discovered || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to scan GitHub profile");
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleApplySkills = async () => {
    if (!student.id) return;
    setSaving(true);
    setError(null);
    try {
      const existing = student.skills || [];
      const merged = Array.from(new Set([...existing, ...selectedSkills]));

      const res = await authFetch(`/api/student/${student.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: merged,
          github_url: githubInput.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to save updated skills");
      setSuccessMessage(`Successfully added ${selectedSkills.length} new skills!`);
      if (onSkillsUpdated) onSkillsUpdated(merged);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not update profile skills");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#141b1d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                PROFILE_EXPANSION_ENGINE
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Auto-Discover Skills from GitHub
            </h2>
            <p className="text-xs text-[#bbc9cd] mt-0.5">
              Inspect public repositories and commit patterns to enrich your candidate vector.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-6 border-b border-white/5 bg-black/20 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Github className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
                placeholder="https://github.com/your-username or username"
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={loading}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Scan & Discover
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMessage}
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {!result && !loading && (
            <div className="text-center py-12 space-y-3">
              <FolderGit2 className="w-12 h-12 text-white/20 mx-auto" />
              <p className="text-sm font-mono text-white/40">
                Enter your GitHub profile link above to automatically analyze languages, frameworks, and top repositories.
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16 font-mono text-sm text-cyan-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span>Scanning public repositories, languages, and topics...</span>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Telemetry Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 font-mono">
                  <div className="text-[10px] text-white/40 uppercase">Public Repos</div>
                  <div className="text-lg font-bold text-white">{result.github_telemetry?.public_repos || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 font-mono">
                  <div className="text-[10px] text-white/40 uppercase">Confidence</div>
                  <div className="text-lg font-bold text-emerald-400">{result.github_telemetry?.confidence_level || "Moderate"}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 font-mono">
                  <div className="text-[10px] text-white/40 uppercase">New Skills</div>
                  <div className="text-lg font-bold text-cyan-400">+{result.new_skills_discovered?.length || 0}</div>
                </div>
              </div>

              {/* Newly Discovered Skills Checkbox Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Newly Inferred Competencies ({result.new_skills_discovered?.length || 0})
                  </span>
                  <span className="text-[10px] font-mono text-white/40">Click to select/unselect</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {result.new_skills_discovered && result.new_skills_discovered.length > 0 ? (
                    result.new_skills_discovered.map((skill: string, idx: number) => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                            isSelected
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                              : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <Plus className="w-3.5 h-3.5" />}
                          {skill}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs font-mono text-white/40">All discovered skills already exist on your profile.</p>
                  )}
                </div>
              </div>

              {/* Top Repository Highlights */}
              {result.github_telemetry?.repo_highlights && result.github_telemetry.repo_highlights.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold text-white/60 uppercase tracking-wider">
                    Repository Evidence
                  </span>
                  <div className="space-y-2">
                    {result.github_telemetry.repo_highlights.slice(0, 3).map((repo: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-mono font-bold text-white">{repo.name}</div>
                          {repo.description && <div className="text-[11px] text-[#bbc9cd] line-clamp-1">{repo.description}</div>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-white/40">
                          {repo.language && <span className="text-cyan-400">{repo.language}</span>}
                          {repo.stars > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400" /> {repo.stars}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {result && (
          <div className="p-4 border-t border-white/10 bg-black/40 flex justify-between items-center">
            <span className="text-xs font-mono text-white/40">
              {selectedSkills.length} skills selected to merge
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySkills}
                disabled={saving || selectedSkills.length === 0}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Add to Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
