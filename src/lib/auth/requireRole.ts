import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { extractRole } from '@/types/auth';
import type { AppRole } from '@/types/auth';

export class ApiError extends Error {
  constructor(public code: 'UNAUTHENTICATED' | 'FORBIDDEN', message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function requireRole(allowed: AppRole[]): Promise<string> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new ApiError('UNAUTHENTICATED', 'Not authenticated');
  const role = extractRole(user);
  if (!role || !allowed.includes(role))
    throw new ApiError('FORBIDDEN', 'Insufficient role');
  return user.id;
}

export function handleApiError(e: unknown): Response {
  if (e instanceof ApiError)
    return Response.json({ error: e.code },
      { status: e.code === 'UNAUTHENTICATED' ? 401 : 403 });
  console.error(e);
  return Response.json({ error: 'INTERNAL' }, { status: 500 });
}
