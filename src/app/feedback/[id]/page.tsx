'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Send, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Sliders,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

export default function FeedbackPage() {
  const { id } = useParams();
  const router = useRouter();
  const [studentName, setStudentName] = useState('Candidate');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [reviewerRole, setReviewerRole] = useState('peer');
  const [scores, setScores] = useState({
    IQ: 70,
    EQ: 70,
    SQ: 70,
    AQ: 70,
    SpQ: 70,
  });
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    async function fetchStudent() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('students')
          .select('full_name')
          .eq('id', id)
          .single();
        
        if (fetchErr) throw fetchErr;
        if (data) {
          setStudentName(data.full_name);
        }
      } catch (err) {
        console.error('Failed to load student name for feedback page:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [id]);

  const handleScoreChange = (dim: string, val: number) => {
    setScores(prev => ({ ...prev, [dim]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: id,
          reviewer_email: reviewerEmail,
          reviewer_role: reviewerRole,
          dimension_scores: scores,
          feedback_text: feedbackText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to submit feedback');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center font-mono relative overflow-hidden">
        <div className="absolute inset-0 bg-cyber-grid bg-[length:50px_50px] opacity-10"></div>
        <div className="flex flex-col items-center gap-6 relative z-10">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
          <p className="text-cyan-400 text-xs tracking-[0.3em] font-black uppercase animate-pulse">Initializing_Feedback_Portal...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0e1416] text-[#dde4e5] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-cyber-grid bg-[length:50px_50px] opacity-5"></div>
        <div className="w-full max-w-md bg-[#1a2326]/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-8 text-center shadow-2xl relative z-10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent rounded-t-2xl" />
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6 animate-bounce" />
          <h2 className="text-2xl font-mono font-bold tracking-tight text-white mb-2 uppercase">Feedback_Transmitted</h2>
          <p className="text-[#bbc9cd] text-sm mb-8 leading-relaxed">
            Your evaluation matrix for <span className="text-cyan-400 font-bold">{studentName}</span> has been securely written to the database node.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-green-500/10 border border-green-500/30 text-green-400 font-mono py-3 rounded-xl hover:bg-green-500/20 active:scale-95 transition-all text-xs font-black uppercase tracking-wider"
          >
            Return to Core
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#dde4e5] py-20 px-6 relative overflow-hidden selection:bg-cyan-500/30">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-[0.3em] mb-6">
            <Users className="w-3.5 h-3.5" /> 360_Observer_Overlay
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-4 uppercase">
            Evaluate <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">{studentName}</span>
          </h1>
          <p className="text-[#bbc9cd] font-medium tracking-tight">Your evaluation will overlay onto the candidate’s profile as external validation.</p>
        </div>

        <div className="bg-[#1a2326]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-mono animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Your_Email_Address</label>
                <input
                  type="email"
                  required
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                  placeholder="reviewer@organization.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Your_Observer_Role</label>
                <select
                  value={reviewerRole}
                  onChange={(e) => setReviewerRole(e.target.value)}
                  className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm appearance-none"
                >
                  <option value="peer">Peer / Teammate</option>
                  <option value="mentor">Mentor / Advisor</option>
                  <option value="professor">Professor / Instructor</option>
                  <option value="manager">Manager / Lead</option>
                </select>
              </div>
            </div>

            {/* Slider competency vectors */}
            <div className="space-y-6 pt-4 border-t border-white/5">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-pink-400 flex items-center gap-2">
                <Sliders className="w-4 h-4" /> Competency_Vector_Inputs
              </h3>
              
              {Object.entries(scores).map(([dim, score]) => (
                <div key={dim} className="space-y-2 bg-[#0e1416]/40 border border-white/5 p-4 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs uppercase tracking-widest font-black text-white/60">{dim} score</span>
                    <span className="font-mono text-xs font-bold text-pink-400">{score}/100</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={score}
                    onChange={(e) => handleScoreChange(dim, parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t border-white/5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Qualitative_Validation_Text</label>
              <textarea
                required
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm resize-none"
                placeholder="Detail the candidate’s core strengths, collaboration style, and growth gaps observed..."
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-mono font-black py-5 rounded-xl transition-all shadow-[0_0_30px_rgba(219,70,239,0.3)] hover:shadow-[0_0_50px_rgba(219,70,239,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="flex items-center justify-center gap-3 tracking-[0.2em]">
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      TRANSMITTING...
                    </>
                  ) : (
                    <>
                      TRANSMIT_MATRIX_DATA
                      <Send className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
