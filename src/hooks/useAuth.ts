'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface UseAuthOptions {
  /** If set, only users with emails ending in this domain are allowed */
  requiredDomain?: string;
  /** Allowed roles for this page (e.g. 'student', 'institution', 'employer') */
  allowedRoles?: string[];
  /** Where to redirect unauthenticated or unauthorized users (default: '/login') */
  redirectTo?: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
}

export function useRequireAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { requiredDomain, allowedRoles, redirectTo = '/login' } = options;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Join the allowed roles array into a stable string to prevent infinite loops
  // when inline array references are passed to the hook.
  const allowedRolesStr = allowedRoles?.join(',');

  useEffect(() => {
    async function checkAuth() {
      try {
        // Use getSession() (reads from cookie storage) instead of getUser()
        // (which makes a Supabase network call on every protected page load).
        // Security is enforced server-side by the Next.js middleware which
        // validates the JWT via createServerClient on every request.
        const { data: { session }, error } = await supabase.auth.getSession();
        const authUser = session?.user ?? null;

        if (error || !authUser) {
          router.push(redirectTo);
          return;
        }

        if (requiredDomain && authUser.email && !authUser.email.endsWith(requiredDomain)) {
          router.push(redirectTo);
          return;
        }

        if (allowedRolesStr) {
          const role = authUser.app_metadata?.role || authUser.user_metadata?.role;
          const isAdmin = role === 'admin';
          const rolesList = allowedRolesStr.split(',');
          
          if (!isAdmin && (!role || !rolesList.includes(role))) {
            router.push(redirectTo);
            return;
          }
        }

        setUser(authUser);
      } catch (err) {
        router.push(redirectTo);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router, requiredDomain, allowedRolesStr, redirectTo]);


  return { user, loading };
}

