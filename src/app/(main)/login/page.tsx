"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, AlertCircle, Loader2, ArrowRight, User, School, Building } from "lucide-react";
import Link from "next/link";

type SignupRole = 'student' | 'institution' | 'employer';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRole, setSignupRole] = useState<SignupRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const role = authData.user.app_metadata?.role;
          const profileId = authData.user.app_metadata?.profile_id;

          // Route by role metadata first (fastest path)
          if (role === "admin") {
            router.push("/admin");
            return;
          }
          if (role === "employer") {
            router.push("/employer");
            return;
          }
          if (role === "student" && profileId) {
            router.push(`/dashboard/${profileId}`);
            return;
          }
          if (role === "institution" && profileId) {
            router.push(`/tpo-dashboard/${profileId}`);
            return;
          }

          // No profile found — send to onboarding
          router.push("/onboard");
        }
      } else {
        // SIGNUP: Store the selected role in user metadata immediately
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              role: signupRole,
            },
          },
        });

        if (authError) throw authError;

        if (authData.session) {
          // Email confirmation is disabled — user is immediately authenticated
          router.push("/onboard");
        } else if (authData.user) {
          // Email confirmation is required — show confirmation prompt
          setSignupSuccess(true);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
      // It redirects to Google so no need to clear loading here unless it fails
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to authenticate with Google");
      setLoading(false);
    }
  };

  const roleOptions: { value: SignupRole; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'student', label: 'Student', icon: <User className="w-5 h-5" />, desc: 'Take assessments & get placed' },
    { value: 'institution', label: 'Institution / TPO', icon: <School className="w-5 h-5" />, desc: 'Manage cohorts & placements' },
    { value: 'employer', label: 'Company', icon: <Building className="w-5 h-5" />, desc: 'Recruit verified talent' },
  ];

  // Show email confirmation screen after successful sign-up
  if (signupSuccess) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        </div>
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="bg-[#1a2326]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-t-2xl" />
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-mono font-bold text-white mb-3 tracking-tight">
              VERIFY_<span className="text-cyan-400">YOUR_EMAIL</span>
            </h2>
            <p className="text-[#dde4e5]/60 font-mono text-sm mb-1">
              A confirmation link has been sent to
            </p>
            <p className="text-cyan-400 font-mono font-bold text-sm mb-6 break-all">{email}</p>
            <p className="text-[#dde4e5]/40 font-mono text-xs mb-8 leading-relaxed">
              Click the link in your email to activate your account. After confirming, you will be redirected to complete your profile setup.
            </p>
            <button
              onClick={() => { setSignupSuccess(false); setIsLogin(true); setPassword(''); }}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono font-bold py-3 rounded-xl transition-all text-sm uppercase tracking-widest"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(#00FFFF 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-mono font-bold tracking-tighter text-white mb-2">
            SYSTEM.<span className="text-cyan-400">ACCESS</span>
          </h1>
          <p className="text-[#dde4e5]/60 font-mono text-sm uppercase tracking-widest">
            {isLogin ? "Authenticate to proceed" : "Initialize new profile"}
          </p>
        </div>

        <div className="bg-[#1a2326]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative">
          {/* Cyber Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-t-2xl" />

          
          <form onSubmit={handleAuth} className="space-y-6">
            {/* Role Selector — only visible during signup */}
            {!isLogin && (
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-cyan-400/70 ml-1">Select_Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {roleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSignupRole(opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                        signupRole === opt.value
                          ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-[#0e1416]/50 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                      }`}
                    >
                      {opt.icon}
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-white/30 text-center tracking-wider">
                  {roleOptions.find(o => o.value === signupRole)?.desc}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-cyan-400/70 ml-1">Email_Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-label="Email address"
                  className="block w-full pl-11 pr-4 py-3 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-cyan-400/70 ml-1">Access_Key</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#dde4e5]/30 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  aria-label="Access key password"
                  className="block w-full pl-11 pr-4 py-3 bg-[#0e1416]/50 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50 transition-all font-mono text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-mono animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden bg-cyan-500 hover:bg-cyan-400 text-[#0e1416] font-mono font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "EXECUTE_LOGIN" : "INITIALIZE_SIGNUP"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-[0.2em]">
                <span className="bg-[#1a2326] px-4 text-[#dde4e5]/40">Or_Use_External_Provider</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#0e1416]/50 hover:bg-white/5 border border-white/10 text-white font-mono font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              AUTHENTICATE_WITH_GOOGLE
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm font-mono text-[#dde4e5]/40 hover:text-cyan-400 transition-colors uppercase tracking-widest"
            >
              {isLogin ? (
                <>New operator? <span className="text-cyan-400 underline underline-offset-4 decoration-cyan-400/30">Request Access</span></>
              ) : (
                <>Existing operator? <span className="text-cyan-400 underline underline-offset-4 decoration-cyan-400/30">Verify Credentials</span></>
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 flex justify-center gap-6 text-[10px] font-mono uppercase tracking-[0.2em] text-[#dde4e5]/20">
          <Link href="#" className="hover:text-cyan-400/50 transition-colors underline decoration-white/5">Privacy_Protocols</Link>
          <Link href="#" className="hover:text-cyan-400/50 transition-colors underline decoration-white/5">Terms_of_Service</Link>
        </div>
      </div>
    </div>
  );
}
