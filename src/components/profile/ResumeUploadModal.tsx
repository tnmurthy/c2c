import React, { useState } from 'react';
import { X, Loader2, Link as LinkIcon, Briefcase, Phone, AlignLeft } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSuccess: () => void;
}

export default function ResumeUploadModal({ isOpen, onClose, student, onSuccess }: ResumeUploadModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    bio: student.bio || '',
    skills: student.skills ? student.skills.join(', ') : '',
    phone: student.phone || '',
    linkedin_url: student.linkedin_url || '',
    resume_url: student.resume_url || ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const skillsArray = formData.skills
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      const res = await authFetch(`/api/student/${student.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          skills: skillsArray
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update profile');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0a0f11] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold font-mono text-white uppercase tracking-wider">Complete Profile</h2>
          <p className="text-[#bbc9cd]/60 text-xs font-mono mt-1">Enhance your visibility to top employers.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">Short Bio</label>
            <div className="relative group">
              <div className="absolute top-3 left-4 flex items-start pointer-events-none">
                <AlignLeft className="h-4 w-4 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="block w-full pl-11 pr-4 py-2.5 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm min-h-[80px]"
                placeholder="Briefly describe your goals..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">Technical Skills</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Briefcase className="h-4 w-4 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="block w-full pl-11 pr-4 py-2.5 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                placeholder="React, Python, SQL (comma separated)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">Phone</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2.5 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">LinkedIn URL</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-4 w-4 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2.5 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                  placeholder="linkedin.com/in/..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1">Resume Link</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <LinkIcon className="h-4 w-4 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                type="url"
                value={formData.resume_url}
                onChange={(e) => setFormData({ ...formData, resume_url: e.target.value })}
                className="block w-full pl-11 pr-4 py-2.5 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                placeholder="Link to your resume (Drive, Dropbox, etc.)"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#0e1416] font-mono font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SAVE PROFILE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
