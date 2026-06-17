'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirectUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          router.push('/login');
          return;
        }

        const role = user.user_metadata?.role;
        const profileId = user.user_metadata?.profile_id;

        if (role === 'employer') {
          router.push('/employer');
        } else if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'student' && profileId) {
          router.push(`/dashboard/${profileId}`);
        } else if (role === 'institution' && profileId) {
          router.push(`/tpo-dashboard/${profileId}`);
        } else {
          // If no role or profile_id in metadata, look up database records in parallel
          const email = user.email || '';
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

          router.push('/onboard');
        }
      } catch (e) {
        console.error('Redirection error:', e);
        router.push('/login');
      }
    }

    redirectUser();
  }, [router]);

  return <LoadingScreen title="Routing operator" subtitle="Establishing Secure Connection Node..." />;
}
