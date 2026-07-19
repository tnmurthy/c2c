"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Mail, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);
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

  const emailAuth = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    const result = returning
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (result.error) { setError(result.error.message); setLoading(false); return; }
    if (result.data.user && (returning || result.data.session)) routeUser(result.data.user);
    else setError("Check your email to confirm your account, then return here to sign in.");
    setLoading(false);
  };

  return <main className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden p-6">
    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(#00FFFF 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
    <section className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a2326]/90 p-8 shadow-2xl backdrop-blur-xl">
      <header className="mb-8 text-center"><p className="text-xs font-mono font-bold tracking-[.2em] text-cyan-400">SECURE ACCESS</p><h1 className="mt-3 font-mono text-4xl font-bold text-white">ONE.<span className="text-cyan-400">CLICK</span>_ACCESS</h1><p className="mt-3 text-sm text-[#bbc9cd]">New here or returning? Use the same button.</p></header>
      <button onClick={continueWithGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl bg-cyan-500 py-4 font-mono text-sm font-bold text-[#0e1416] transition hover:bg-cyan-400 disabled:opacity-50">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleMark />} CONTINUE WITH GOOGLE</button>
      <p className="mt-4 text-center text-xs leading-5 text-[#bbc9cd]">Your account is created automatically the first time you continue. Profile details come after you are in.</p>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="mt-7 border-t border-white/10 pt-2"><button onClick={() => setShowEmail(!showEmail)} className="flex w-full items-center justify-between py-3 text-xs font-mono text-[#bbc9cd] hover:text-cyan-400">USE EMAIL AND PASSWORD INSTEAD <ChevronDown className={`h-4 w-4 ${showEmail ? "rotate-180" : ""}`} /></button>
      {showEmail && <form onSubmit={emailAuth} className="space-y-4 pt-4"><label className="block text-xs text-[#bbc9cd]">EMAIL<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white" /></label><label className="block text-xs text-[#bbc9cd]">PASSWORD<input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white" /></label><button disabled={loading} className="w-full rounded-lg border border-cyan-400/40 p-3 text-xs font-bold text-cyan-400">{returning ? "SIGN IN WITH EMAIL" : "CREATE EMAIL ACCOUNT"}</button><button type="button" onClick={() => setReturning(!returning)} className="w-full text-xs text-[#bbc9cd]">{returning ? "Need an email account? Create one" : "Already registered? Sign in"}</button></form>}</div>
    </section>
  </main>;
}

function GoogleMark() { return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>; }
