"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          const role = authData.user.user_metadata?.role;
          if (role === "employer") {
            router.push("/employer");
            return;
          }
          if (role === "admin") {
            router.push("/admin");
            return;
          }

          // Check if user is a student or institution in parallel
          const [studentResult, institutionResult] = await Promise.allSettled([
            supabase.from("students").select("id").eq("email", email).single(),
            supabase.from("institutions").select("id").eq("email", email).single(),
          ]);

          if (studentResult.status === "fulfilled" && studentResult.value.data) {
            router.push(`/dashboard/${studentResult.value.data.id}`);
            return;
          }

          if (institutionResult.status === "fulfilled" && institutionResult.value.data) {
            router.push(`/tpo-dashboard/${institutionResult.value.data.id}`);
            return;
          }

          // Fallback if no record found
          router.push("/onboard");
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          router.push("/onboard");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

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
                  placeholder="name@campus.edu"
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
