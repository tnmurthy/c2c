"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function TPODashboardIndex() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function resolveTPOInstitution() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Check if user is logged in with profile_id in metadata
        if (user) {
          const profileId = user.app_metadata?.profile_id || user.user_metadata?.profile_id || user.user_metadata?.institution_id;
          if (profileId) {
            router.push(`/tpo-dashboard/${profileId}`);
            return;
          }

          // 2. Query institutions table by user's email domain or auth_id
          const email = user.email || "";
          const domain = email.split("@")[1] || "";
          
          const { data: instByDomain } = await supabase
            .from("institutions")
            .select("id")
            .eq("domain", domain)
            .maybeSingle();

          if (instByDomain?.id) {
            router.push(`/tpo-dashboard/${instByDomain.id}`);
            return;
          }

          const { data: instByAuth } = await supabase
            .from("institutions")
            .select("id")
            .eq("auth_id", user.id)
            .maybeSingle();

          if (instByAuth?.id) {
            router.push(`/tpo-dashboard/${instByAuth.id}`);
            return;
          }
        }

        // 3. Fallback: Find the default / first active institution in the database
        const { data: defaultInst } = await supabase
          .from("institutions")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (defaultInst?.id) {
          router.push(`/tpo-dashboard/${defaultInst.id}`);
          return;
        }

        // 4. If no institution exists or user needs to sign in
        if (!user) {
          router.push("/login");
        } else {
          router.push("/onboard");
        }
      } catch (err) {
        console.error("TPO Routing error:", err);
        setErrorMsg("Unable to resolve institutional cohort node.");
        setTimeout(() => router.push("/login"), 2000);
      }
    }

    resolveTPOInstitution();
  }, [router]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#0e1416] flex items-center justify-center p-6 font-mono text-center text-slate-200">
        <div className="bg-black/60 border border-red-500/30 p-8 rounded-xl max-w-md">
          <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
          <p className="text-xs text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <LoadingScreen title="Routing to TPO Command Center" subtitle="Identifying institutional cohort node..." />;
}
