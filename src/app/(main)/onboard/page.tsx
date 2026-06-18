'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  UserPlus, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Activity,
  Shield,
  Zap,
  Globe,
  Building,
  School,
  User
} from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

type Role = 'student' | 'institution' | 'employer';

export default function Onboard() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();
  
  const [activeRole, setActiveRole] = useState<Role>('student');
  const [authId, setAuthId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [studentForm, setStudentForm] = useState({
    full_name: '',
    email: '',
    graduation_year: new Date().getFullYear(),
    department: '',
  });

  const [institutionForm, setInstitutionForm] = useState({
    name: '',
    type: 'University',
    domain: '',
    location: '',
  });

  const [employerForm, setEmployerForm] = useState({
    company_name: '',
    industry: '',
    contact_person: '',
  });

  useEffect(() => {
    if (user) {
      setAuthId(user.id);
      if (user.email) {
        setStudentForm(prev => ({ ...prev, email: user.email || '' }));
        // Extract domain name for TPO onboarding default
        const domain = user.email.split('@')[1] || '';
        setInstitutionForm(prev => ({ ...prev, domain }));
      }
    }
  }, [user]);

  const handleStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStudentForm(prev => ({
      ...prev,
      [name]: name === 'graduation_year' ? parseInt(value, 10) || new Date().getFullYear() : value,
    }));
  };

  const handleInstitutionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInstitutionForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmployerForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authId) {
      setError('Authentication session missing. Please re-login.');
      return;
    }
    
    setSubmitting(true);
    setError('');

    try {
      if (activeRole === 'student') {
        const res = await authFetch('/api/onboard/student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...studentForm,
            auth_id: authId,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Failed to onboard student');
        }
        
        const result = await res.json();
        const studentId = result && result.length > 0 ? result[0].id : null;
        
        if (studentId) {
          localStorage.setItem('student_id', studentId);
          // Set role metadata in Supabase
          await supabase.auth.updateUser({
            data: { role: 'student', profile_id: studentId }
          });
          await supabase.auth.refreshSession();
          router.push(`/dashboard/${studentId}`);
        } else {
          throw new Error('No student profile ID returned from database.');
        }

      } else if (activeRole === 'institution') {
        const res = await authFetch('/api/onboard/institution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(institutionForm),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Failed to onboard institution');
        }

        const result = await res.json();
        const instId = result && result.length > 0 ? result[0].id : null;

        if (instId) {
          await supabase.auth.updateUser({
            data: { role: 'institution', profile_id: instId }
          });
          await supabase.auth.refreshSession();
          router.push(`/tpo-dashboard/${instId}`);
        } else {
          throw new Error('No institution profile ID returned from database.');
        }

      } else if (activeRole === 'employer') {
        const res = await authFetch('/api/onboard/employer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employerForm),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Failed to onboard employer');
        }

        await supabase.auth.updateUser({
          data: { role: 'employer' } // Profile ID can also be added here if needed, but employer dashboard uses current_user directly currently
        });
        await supabase.auth.refreshSession();
        router.push('/employer');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during profile synchronization.');
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
          <p className="text-cyan-400 text-xs tracking-[0.3em] font-black uppercase animate-pulse">Syncing_Auth_State...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#dde4e5] selection:bg-cyan-500/30 py-20 px-6 relative overflow-hidden">
      {/* Ambient Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[120px] -z-10 pointer-events-none"></div>

      <div className="max-w-xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full font-mono text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] mb-6">
            <UserPlus className="w-3.5 h-3.5" /> Protocol_Initialization
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-4 uppercase">
            Initialize <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Legend_Profile</span>
          </h1>
          <p className="text-[#bbc9cd] font-medium tracking-tight">Synchronize your credentials with the platform evaluation matrix.</p>
        </div>

        {/* Role Selector tabs */}
        <div className="flex bg-[#12191b]/90 border border-white/5 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveRole('student'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-xs uppercase tracking-widest font-black transition-all ${
              activeRole === 'student' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" /> Student
          </button>
          <button
            type="button"
            onClick={() => { setActiveRole('institution'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-xs uppercase tracking-widest font-black transition-all ${
              activeRole === 'institution' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <School className="w-4 h-4" /> Institution/TPO
          </button>
          <button
            type="button"
            onClick={() => { setActiveRole('employer'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-xs uppercase tracking-widest font-black transition-all ${
              activeRole === 'employer' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" /> Employer
          </button>
        </div>

        <div className="bg-[#1a2326]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          
          <form className="space-y-8" onSubmit={handleSubmit}>
            {error && (
              error.includes('students_email_key') || error.includes('already exists') ? (
                <div className="flex flex-col items-center justify-center gap-4 p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-center animate-in fade-in slide-in-from-top-1">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-2">
                    <User className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Account Already Exists</h3>
                    <p className="text-sm text-[#bbc9cd]">It looks like an account with this email is already registered.</p>
                  </div>
                  <Link 
                    href="/login"
                    className="mt-2 w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-[#00363e] font-black uppercase tracking-[0.15em] text-xs rounded-lg transition-all text-center"
                  >
                    Proceed to Login
                  </Link>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-mono animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )
            )}

            <div className="grid grid-cols-1 gap-8">
              {/* STUDENT FORM FIELDS */}
              {activeRole === 'student' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Candidate_Full_Name</label>
                    <input
                      name="full_name"
                      type="text"
                      required
                      value={studentForm.full_name}
                      onChange={handleStudentChange}
                      className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                      placeholder="Enter your legal name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Institutional_Email</label>
                    <div className="relative">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[9px] font-mono text-green-500/60 font-bold">VERIFIED</span>
                      </div>
                      <input
                        name="email"
                        type="email"
                        readOnly
                        value={studentForm.email}
                        className="block w-full px-5 py-4 bg-[#0e1416]/30 border border-white/5 rounded-xl text-white/40 cursor-not-allowed font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Graduation_Year</label>
                      <input
                        name="graduation_year"
                        type="number"
                        required
                        value={studentForm.graduation_year}
                        onChange={handleStudentChange}
                        className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Academic_Dept</label>
                      <input
                        name="department"
                        type="text"
                        required
                        value={studentForm.department}
                        onChange={handleStudentChange}
                        className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                        placeholder="e.g. CS, AI, Mech"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* INSTITUTION/TPO FORM FIELDS */}
              {activeRole === 'institution' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Institution_Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={institutionForm.name}
                      onChange={handleInstitutionChange}
                      className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                      placeholder="e.g. Stanford University"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Institution_Type</label>
                      <select
                        name="type"
                        value={institutionForm.type}
                        onChange={handleInstitutionChange}
                        className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm appearance-none"
                      >
                        <option value="University" className="bg-[#0e1416] text-white">University</option>
                        <option value="Institute of Technology" className="bg-[#0e1416] text-white">Tech Institute</option>
                        <option value="Business School" className="bg-[#0e1416] text-white">Business School</option>
                        <option value="College" className="bg-[#0e1416] text-white">College</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Email_Domain</label>
                      <input
                        name="domain"
                        type="text"
                        required
                        value={institutionForm.domain}
                        onChange={handleInstitutionChange}
                        className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                        placeholder="e.g. stanford.edu"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Location</label>
                    <input
                      name="location"
                      type="text"
                      required
                      value={institutionForm.location}
                      onChange={handleInstitutionChange}
                      className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                      placeholder="e.g. Stanford, CA"
                    />
                  </div>
                </>
              )}

              {/* EMPLOYER FORM FIELDS */}
              {activeRole === 'employer' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Company_Name</label>
                    <input
                      name="company_name"
                      type="text"
                      required
                      value={employerForm.company_name}
                      onChange={handleEmployerChange}
                      className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                      placeholder="e.g. Tesla Inc."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Industry</label>
                    <input
                      name="industry"
                      type="text"
                      required
                      value={employerForm.industry}
                      onChange={handleEmployerChange}
                      className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                      placeholder="e.g. Robotics, Autonomous Vehicles"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 ml-1 font-black">Recruiter_Contact_Name</label>
                    <input
                      name="contact_person"
                      type="text"
                      required
                      value={employerForm.contact_person}
                      onChange={handleEmployerChange}
                      className="block w-full px-5 py-4 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                      placeholder="Enter contact name"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-black py-5 rounded-xl transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="flex items-center justify-center gap-3 tracking-[0.2em]">
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      SYNCHRONIZING...
                    </>
                  ) : (
                    <>
                      FINALIZE_ONBOARDING
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>

          <div className="mt-12 flex items-center justify-center gap-8 opacity-20 grayscale">
             <Globe className="w-6 h-6" />
             <Shield className="w-6 h-6" />
             <Zap className="w-6 h-6" />
             <Activity className="w-6 h-6" />
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] font-bold">
          Encrypted Connection // Secure Data Sovereignty
        </p>
      </div>
    </div>
  );
}
