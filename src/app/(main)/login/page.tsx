"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Mail, Lock, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  DemoRole,
  buildDemoUser,
  resolveDemoAccount,
  setDemoSession,
} from "@/lib/demoSession";

export default function LoginPage() {
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(true);
  const [returning, setReturning] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const routeUser = (user: { app_metadata?: Record<string, unknown> }) => {
    const { role, profile_id: profileId } = user.app_metadata ?? {};
    if (role === "admin") return router.push("/admin");
    if (role === "employer") return router.push("/employer");
    if (role === "student" && profileId) return router.push(`/dashboard/${profileId}`);
    if (role === "institution" && profileId) return router.push(`/tpo-dashboard/${profileId}`);
    router.push("/onboard");
  };

  const continueWithGoogle = async () => {
    setLoading(true); setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) { setError(authError.message); setLoading(false); }
  };

  const loginDemo = (role: DemoRole, customEmail?: string) => {
    setLoading(true);
    const demoUser = buildDemoUser(role, customEmail);
    setDemoSession(demoUser);
    router.refresh();
    routeUser(demoUser);
  };

  const emailAuth = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    // A demo login requires an exact demo email AND the exact demo password.
    // Never infer a role from a substring of the address, and never accept a
    // password just because it is long enough — either grants any visitor the
    // role of their choosing.
    const demoRole = resolveDemoAccount(cleanEmail, password);
    if (demoRole) {
      loginDemo(demoRole, cleanEmail);
      return;
    }

    if (cleanEmail in DEMO_ACCOUNTS) {
      setError(`Wrong password for the demo account. Use ${DEMO_PASSWORD}.`);
      setLoading(false);
      return;
    }

    // Everything else is a real Supabase account. A failed sign-in is a failed
    // sign-in; it must not silently fall back to a demo session.
    try {
      const result = returning
        ? await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        : await supabase.auth.signUp({ email: cleanEmail, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (result.data.user && (returning || result.data.session)) routeUser(result.data.user);
      else setError("Check your email to confirm your account, then return here to sign in.");
    } catch {
      setError(`Could not reach the authentication service. Demo accounts work offline with the password ${DEMO_PASSWORD}.`);
    } finally {
      setLoading(false);
    }
  };

  const autofill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword(DEMO_PASSWORD);
    setShowEmail(true);
  };

  return <main className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden p-6">
    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(#00FFFF 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
    <section className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a2326]/90 p-8 shadow-2xl backdrop-blur-xl">
      <header className="mb-6 text-center">
        <p className="text-xs font-mono font-bold tracking-[.2em] text-cyan-400">SECURE ACCESS</p>
        <h1 className="mt-2 font-mono text-3xl font-bold text-white">CAMPUS.<span className="text-cyan-400">TO</span>_CORP</h1>
        <p className="mt-2 text-xs text-[#bbc9cd]">Sign in with standard client demo credentials or Google.</p>
      </header>

      {/* Client Test Credentials Card */}
      <div className="mb-6 p-4 rounded-xl bg-black/50 border border-cyan-500/30 text-xs font-mono space-y-2.5">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-cyan-400" /> Demo Credentials
          </span>
          <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-[11px] font-semibold">
            PW: c2c@2026
          </span>
        </div>
        <div className="space-y-1.5 text-slate-300">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">🎓 Student:</span>
            <button type="button" onClick={() => autofill('student@c2c.demo')} className="text-cyan-300 hover:text-cyan-200 hover:underline">
              student@c2c.demo
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">🏛️ TPO (Inst):</span>
            <button type="button" onClick={() => autofill('institution@c2c.demo')} className="text-emerald-300 hover:text-emerald-200 hover:underline">
              institution@c2c.demo
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">💼 Employer:</span>
            <button type="button" onClick={() => autofill('employer@c2c.demo')} className="text-indigo-300 hover:text-indigo-200 hover:underline">
              employer@c2c.demo
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">🛡️ Admin:</span>
            <button type="button" onClick={() => autofill('admin@c2c.demo')} className="text-rose-300 hover:text-rose-200 hover:underline">
              admin@c2c.demo
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 pt-1.5 border-t border-white/5 text-center">
          Click any email above to autofill, or use 1-click buttons below
        </p>
      </div>

      {/* Email / Password Form */}
      {showEmail && (
        <form onSubmit={emailAuth} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono text-[#bbc9cd] uppercase">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input 
                required 
                type="email" 
                value={email} 
                placeholder="student@c2c.demo"
                onChange={e => setEmail(e.target.value)} 
                className="w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400" 
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[#bbc9cd] uppercase">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input 
                required 
                type="password" 
                value={password} 
                placeholder="c2c@2026"
                onChange={e => setPassword(e.target.value)} 
                className="w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400" 
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 font-mono text-sm font-bold text-[#0e1416] transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (returning ? "SIGN IN WITH CREDENTIALS" : "CREATE EMAIL ACCOUNT")}
          </button>
          <div className="flex justify-between items-center text-[11px] text-[#bbc9cd]">
            <button type="button" onClick={() => setReturning(!returning)} className="hover:text-cyan-400">
              {returning ? "Need to create account?" : "Already registered? Sign in"}
            </button>
            <span className="text-slate-500">Demo Password: c2c@2026</span>
          </div>
        </form>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300 text-center">{error}</p>}

      {/* 1-Click Fast Access Section */}
      <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
        <p className="text-[11px] font-mono text-slate-400 text-center uppercase tracking-wider mb-2">Or 1-Click Fast Access</p>
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => loginDemo('student')}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/40 border border-white/10 text-cyan-300 transition-all font-semibold"
          >
            🎓 Student
          </button>
          <button
            type="button"
            onClick={() => loginDemo('institution')}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 border border-white/10 text-emerald-300 transition-all font-semibold"
          >
            🏛️ TPO
          </button>
          <button
            type="button"
            onClick={() => loginDemo('employer')}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/40 border border-white/10 text-indigo-300 transition-all font-semibold"
          >
            💼 Employer
          </button>
          <button
            type="button"
            onClick={() => loginDemo('admin')}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/40 border border-white/10 text-rose-300 transition-all font-semibold"
          >
            🛡️ Admin
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10">
        <button onClick={continueWithGoogle} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 font-mono text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50">
          <GoogleMark /> Continue with Google
        </button>
      </div>
    </section>
  </main>;
}

function GoogleMark() { return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>; }
