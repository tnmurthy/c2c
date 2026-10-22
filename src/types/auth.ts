import type { User } from '@supabase/supabase-js';

export type AppRole = 'student' | 'institution' | 'employer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  institution_id?: string;
}

export function extractRole(user: User): AppRole | null {
  const role = user.app_metadata?.role;
  const valid: AppRole[] = ['student', 'institution', 'employer', 'admin'];
  return valid.includes(role) ? (role as AppRole) : null;
}
