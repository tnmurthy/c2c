'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';
import { Briefcase, MapPin, DollarSign, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateJobPage() {
  const { user, loading: authLoading } = useRequireAuth({ allowedRoles: ['employer'] });
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    is_remote: false,
    salary_range: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const requirementsArray = formData.requirements
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const res = await authFetch('/api/employer/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requirements: requirementsArray
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create job posting');
      }

      router.push('/employer');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#0e1416] text-[#dde4e5] font-sans">
      <header className="border-b border-white/5 bg-[#0a0f11] py-4 px-6 flex items-center gap-4">
        <Link href="/employer" className="text-white/40 hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold font-mono tracking-wider uppercase text-white">Create Job Requisition</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="bg-[#0a0f11] border border-white/10 rounded-2xl p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-mono">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">Job Title</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Briefcase className="h-5 w-5 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="block w-full pl-11 pr-4 py-3 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                placeholder="Senior Full Stack Engineer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="block w-full px-4 py-3 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm min-h-[150px]"
              placeholder="Describe the role, responsibilities, and team..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">Requirements (Skills)</label>
            <input
              type="text"
              required
              value={formData.requirements}
              onChange={e => setFormData({ ...formData, requirements: e.target.value })}
              className="block w-full px-4 py-3 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
              placeholder="React, Node.js, System Design (comma separated)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">Location</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="block w-full pl-11 pr-4 py-3 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                  placeholder="San Francisco, CA"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">Salary Range</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={formData.salary_range}
                  onChange={e => setFormData({ ...formData, salary_range: e.target.value })}
                  className="block w-full pl-11 pr-4 py-3 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                  placeholder="$120k - $160k"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_remote"
              checked={formData.is_remote}
              onChange={e => setFormData({ ...formData, is_remote: e.target.checked })}
              className="w-4 h-4 rounded bg-[#0e1416] border-white/10 text-cyan-500 focus:ring-cyan-500/20"
            />
            <label htmlFor="is_remote" className="text-sm font-mono text-white/80">
              This is a remote position
            </label>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#0e1416] font-mono font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'PUBLISH REQUISITION'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
