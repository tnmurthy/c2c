'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { getDemoUser } from '@/lib/demoSession';

export interface UseAuthSessionReturn {
  session: Session | null;
  user: User | null;
  role: string | null;
  tenantId: string | null;
  loading: boolean;
}

function getDemoSession(): { user: any; role: string; tenantId: string } | null {
  const user = getDemoUser();
  if (!user) return null;

  return {
    user,
    role: user.app_metadata.role,
    tenantId: user.app_metadata.tenant_id,
  };
}

export function useAuthSession(): UseAuthSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function resolveSessionData(activeSession: Session | null) {
      if (!activeSession) {
        const demo = getDemoSession();
        if (demo && active) {
          setSession(null);
          setUser(demo.user);
          setRole(demo.role);
          setTenantId(demo.tenantId);
          setLoading(false);
          return;
        }

        if (active) {
          setSession(null);
          setUser(null);
          setRole(null);
          setTenantId(null);
          setLoading(false);
        }
        return;
      }

      const activeUser = activeSession.user;
      const userRole = activeUser.app_metadata?.role || activeUser.user_metadata?.role || null;
      let resolvedTenantId = activeUser.app_metadata?.tenant_id || null;

      if (!resolvedTenantId && activeUser) {
        try {
          const { data: crmUser } = await supabase
            .from('crm_users')
            .select('tenant_id')
            .eq('user_id', activeUser.id)
            .maybeSingle();

          if (crmUser?.tenant_id) {
            resolvedTenantId = crmUser.tenant_id;
          }
        } catch (e) {
          // Ignore offline errors
        }
      }

      if (active) {
        setSession(activeSession);
        setUser(activeUser);
        setRole(userRole);
        setTenantId(resolvedTenantId || 'tenant-001');
        setLoading(false);
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      resolveSessionData(initSession);
    }).catch(() => {
      const demo = getDemoSession();
      if (demo && active) {
        setUser(demo.user);
        setRole(demo.role);
        setTenantId(demo.tenantId);
      }
      if (active) setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      resolveSessionData(newSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, user, role, tenantId, loading };
}
