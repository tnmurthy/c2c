import type { User } from '@supabase/supabase-js';

/** Reads the user's role from app_metadata (set server-side) or user_metadata (fallback). */
export function getUserRole(user: User): string | null {
  return user.app_metadata?.role || user.user_metadata?.role || null;
}
