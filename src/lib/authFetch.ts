'use client';

import { supabase } from '@/lib/supabase';

/**
 * Authenticated fetch wrapper.
 * Automatically retrieves the current Supabase session JWT
 * and attaches it as an `Authorization: Bearer <token>` header.
 * Falls back to demo-access-token if a demo session is active.
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
    } else if (typeof document !== 'undefined') {
      const cookies = document.cookie;
      if (cookies.includes('demo_role') || cookies.includes('demo-access-token') || localStorage.getItem('demo_user')) {
        headers.set('Authorization', 'Bearer demo-access-token');
      }
    }
  } catch {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie;
      if (cookies.includes('demo_role') || cookies.includes('demo-access-token') || localStorage.getItem('demo_user')) {
        headers.set('Authorization', 'Bearer demo-access-token');
      }
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
