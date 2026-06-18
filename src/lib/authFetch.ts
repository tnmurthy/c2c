'use client';

import { supabase } from '@/lib/supabase';

/**
 * Authenticated fetch wrapper.
 * Automatically retrieves the current Supabase session JWT
 * and attaches it as an `Authorization: Bearer <token>` header.
 *
 * Use this for ALL `/api/*` calls that require authentication.
 * Falls back to a regular fetch if no session is available.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
  } catch {
    // If getSession fails, proceed without auth header —
    // the backend will return 401 and the frontend auth guard will redirect.
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
