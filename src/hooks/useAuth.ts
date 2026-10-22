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

function getDemoUserFromStorage(): any {
  if (typeof document === 'undefined') return null;

  try {
    // 1. Check demo_user cookie
    const cookies = document.cookie;
    const matchUser = cookies.match(/demo_user=([^;]+)/);
    if (matchUser) {
      try {
        const parsed = JSON.parse(decodeURIComponent(matchUser[1]));
        if (parsed?.app_metadata?.role) return parsed;
      } catch {}
    }

    // 2. Check demo_role cookie
    const matchRole = cookies.match(/demo_role=([^;]+)/);
    if (matchRole) {
      const role = matchRole[1];
      const profileId = role === 'student' ? 'stu-001' : role === 'institution' ? 'inst-001' : role === 'employer' ? 'emp-001' : 'admin-001';
      return {
        id: `${role}-001`,
        email: `${role}@c2c.demo`,
        app_metadata: { role, profile_id: profileId },
        user_metadata: { role, profile_id: profileId },
      };
    }

    // 3. Check localStorage
    const localDemo = localStorage.getItem('demo_user');
    if (localDemo) {
      return JSON.parse(localDemo);
    }
    const localRole = localStorage.getItem('demo_role');
    if (localRole) {
      const profileId = localRole === 'student' ? 'stu-001' : localRole === 'institution' ? 'inst-001' : localRole === 'employer' ? 'emp-001' : 'admin-001';
      return {
        id: `${localRole}-001`,
        email: `${localRole}@c2c.demo`,
        app_metadata: { role: localRole, profile_id: profileId },
        user_metadata: { role: localRole, profile_id: profileId },
      };
    }
  } catch {}

  return null;
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
          authUser = getDemoUserFromStorage();
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
