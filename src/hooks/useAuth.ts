'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { getDemoUser } from '@/lib/demoSession';

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

  const allowedRolesStr = allowedRoles?.join(',');

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        let authUser: any = null;

        // Check Supabase session first
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session?.user) {
            authUser = session.user;
          }
        } catch {
          // Supabase might be offline
        }

        // Fallback to demo credentials
        if (!authUser) {
          authUser = getDemoUser();
        }

        if (!authUser) {
          if (isMounted) {
            setLoading(false);
            router.push(redirectTo);
          }
          return;
        }

        // Domain verification if required
        if (requiredDomain && authUser.email && !authUser.email.endsWith(requiredDomain)) {
          if (isMounted) {
            setLoading(false);
            router.push(redirectTo);
          }
          return;
        }

        // Role verification if required
        if (allowedRolesStr) {
          const role = authUser.app_metadata?.role || authUser.user_metadata?.role;
          const isAdmin = role === 'admin';
          const rolesList = allowedRolesStr.split(',');

          if (!isAdmin && (!role || !rolesList.includes(role))) {
            if (isMounted) {
              setLoading(false);
              router.push(redirectTo);
            }
            return;
          }
        }

        if (isMounted) {
          setUser(authUser);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setLoading(false);
          router.push(redirectTo);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router, requiredDomain, allowedRolesStr, redirectTo]);

  return { user, loading };
}
