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

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();

        if (error || !authUser) {
          router.push(redirectTo);
          return;
        }

        if (requiredDomain && authUser.email && !authUser.email.endsWith(requiredDomain)) {
          router.push(redirectTo);
          return;
        }

        if (allowedRoles && allowedRoles.length > 0) {
          const role = authUser.user_metadata?.role;
          // Admins can bypass role restriction
          const email = authUser.email || '';
          const isAdmin = role === 'admin' || email.endsWith('@taliatech.in');
          
          if (!isAdmin && (!role || !allowedRoles.includes(role))) {
            router.push(redirectTo);
            return;
          }
        }

        setUser(authUser);
      } catch {
        router.push(redirectTo);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router, requiredDomain, allowedRoles, redirectTo]);

  return { user, loading };
}
