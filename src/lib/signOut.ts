import { supabase } from '@/lib/supabase';
import { clearDemoSession } from '@/lib/demoSession';

/**
 * Sign out of both session kinds.
 *
 * `supabase.auth.signOut()` only knows about real Supabase sessions, so on its
 * own it leaves a demo session fully intact — the user clicks Logout and stays
 * logged in. Always use this instead.
 */
export async function signOutEverywhere(): Promise<void> {
  clearDemoSession();
  try {
    await supabase.auth.signOut();
  } catch {
    // A failed remote sign-out must not leave the local session behind; the
    // demo cookies are already cleared above.
  }
}
