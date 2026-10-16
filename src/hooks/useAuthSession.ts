'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface UseAuthSessionReturn {
  session: Session | null;
  user: User | null;
  role: string | null;
  tenantId: string | null;
  loading: boolean;
}

function getDemoSession(): { user: any; role: string; tenantId: string } | null {
  if (typeof document === 'undefined') return null;

  try {
    const cookies = document.cookie;
    const matchRole = cookies.match(/demo_role=([^;]+)/);
    const matchUser = cookies.match(/demo_user=([^;]+)/);

    let user: any = null;
    let role: string = 'admin';

    if (matchUser) {
      try {
        user = JSON.parse(decodeURIComponent(matchUser[1]));
        role = user.app_metadata?.role || user.user_metadata?.role || 'admin';
      } catch {}
    } else if (matchRole) {
      role = matchRole[1];
      const profileId = role === 'student' ? 'stu-001' : role === 'institution' ? 'inst-001' : role === 'employer' ? 'emp-001' : 'admin-001';
      user = {
        id: `${role}-001`,
        email: `${role}@c2c.demo`,
        app_metadata: { role, profile_id: profileId, tenant_id: 'tenant-001' },
        user_metadata: { role, profile_id: profileId, tenant_id: 'tenant-001' },
      };
    } else {
      const localRole = localStorage.getItem('demo_role');
      const localUser = localStorage.getItem('demo_user');
      if (localUser) {
        user = JSON.parse(localUser);
        role = user.app_metadata?.role || user.user_metadata?.role || 'admin';
      } else if (localRole) {
        role = localRole;
        const profileId = role === 'student' ? 'stu-001' : role === 'institution' ? 'inst-001' : role === 'employer' ? 'emp-001' : 'admin-001';
        user = {
          id: `${role}-001`,
          email: `${role}@c2c.demo`,
          app_metadata: { role, profile_id: profileId, tenant_id: 'tenant-001' },
          user_metadata: { role, profile_id: profileId, tenant_id: 'tenant-001' },
        };
      }
    }

    if (user) {
      return {
        user,
        role,
        tenantId: user.app_metadata?.tenant_id || user.user_metadata?.tenant_id || 'tenant-001',
      };
    }
  } catch {}

  return null;
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
