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
      const userRole = activeUser.app_metadata?.role || null;
      let resolvedTenantId = activeUser.app_metadata?.tenant_id || null;

      if (!resolvedTenantId && activeUser) {
        // 1. Try to resolve from crm_users profile
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
          console.error('Error resolving tenant from crm_users:', e);
        }

        // 2. Fallback to students table
        if (!resolvedTenantId) {
          try {
            const { data: studentDataRaw } = await supabase
              .from('students')
              .select('tenant_id' as any)
              .eq('auth_id', activeUser.id)
              .maybeSingle();
            const studentData = studentDataRaw as any;

            if (studentData?.tenant_id) {
              resolvedTenantId = studentData.tenant_id;
            }
          } catch (e) {
            // Field might not exist; safe to ignore
          }
        }

        // 3. Fallback to employers table
        if (!resolvedTenantId) {
          try {
            const { data: employerDataRaw } = await supabase
              .from('employers')
              .select('tenant_id' as any)
              .eq('auth_id', activeUser.id)
              .maybeSingle();
            const employerData = employerDataRaw as any;

            if (employerData?.tenant_id) {
              resolvedTenantId = employerData.tenant_id;
            }
          } catch (e) {
            // Field might not exist; safe to ignore
          }
        }
      }

      if (active) {
        setSession(activeSession);
        setUser(activeUser);
        setRole(userRole);
        setTenantId(resolvedTenantId);
        setLoading(false);
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      resolveSessionData(initSession);
    }).catch((err) => {
      console.error('Error fetching initial session:', err);
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
