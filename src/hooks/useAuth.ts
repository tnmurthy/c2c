'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface UseAuthOptions {
  /** If set, only users with emails ending in this domain are allowed */
  requiredDomain?: string;
  /** Where to redirect unauthenticated users (default: '/login') */
  redirectTo?: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
}

export function useRequireAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { requiredDomain, redirectTo = '/login' } = options;
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

        setUser(authUser);
      } catch {
        router.push(redirectTo);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router, requiredDomain, redirectTo]);

  return { user, loading };
}
