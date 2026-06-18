'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        // Supabase client automatically processes the #access_token hash on load.
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        if (!session) {
          router.push('/login');
          return;
        }

        const user = session.user;
        const role = user.user_metadata?.role;
        const profileId = user.user_metadata?.profile_id;

        // Same routing logic as login/page.tsx
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

        // Fallback: DB lookup
        const email = user.email || "";
        const domain = email.split("@")[1] || "";
        const [studentResult, institutionResult] = await Promise.allSettled([
          supabase.from("students").select("id").eq("email", email).single(),
          supabase.from("institutions").select("id").eq("domain", domain).single(),
        ]);

        if (studentResult.status === "fulfilled" && studentResult.value.data) {
          await supabase.auth.updateUser({
            data: { role: 'student', profile_id: studentResult.value.data.id }
          });
          await supabase.auth.refreshSession(); // ensure JWT gets updated
          router.push(`/dashboard/${studentResult.value.data.id}`);
          return;
        }

        if (institutionResult.status === "fulfilled" && institutionResult.value.data) {
          await supabase.auth.updateUser({
            data: { role: 'institution', profile_id: institutionResult.value.data.id }
          });
          await supabase.auth.refreshSession();
          router.push(`/tpo-dashboard/${institutionResult.value.data.id}`);
          return;
        }

        // Default: send to onboard
        router.push("/onboard");
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
      }
    }

    handleAuthCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center p-6 font-mono text-center">
        <div className="bg-black/60 border border-red-500/30 p-8 rounded-xl max-w-md">
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-[0.2em]">Auth Error</h2>
          <p className="text-[#bbc9cd] text-sm mb-6">{error}</p>
          <button onClick={() => router.push('/login')} className="px-6 py-3 bg-red-950/40 border border-red-500/40 text-red-400 text-xs font-bold uppercase hover:bg-red-950/60 transition-all">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1416] flex flex-col items-center justify-center font-mono">
      <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
      <p className="text-cyan-400/70 uppercase tracking-widest text-sm animate-pulse">Establishing Secure Uplink...</p>
    </div>
  );
}
