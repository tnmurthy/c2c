/**
 * Supabase browser client — uses createBrowserClient from @supabase/ssr
 * so that auth sessions are stored in HTTP cookies (not just localStorage).
 * This allows the Next.js middleware (which uses createServerClient) to read
 * the session and properly protect routes without redirect loops.
 *
 * IMPORTANT: Do NOT switch this back to `createClient` from '@supabase/supabase-js'.
 * That plain client stores sessions in localStorage only, which the server-side
 * middleware cannot read, causing post-login redirect loops.
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Database operations will fail.'
  );
}

export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder_key'
);
