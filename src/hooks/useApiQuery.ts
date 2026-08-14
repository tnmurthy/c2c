'use client';

import { authFetch } from '@/lib/authFetch';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

interface UseApiQueryReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Thin wrapper around useSupabaseQuery for authFetch-based endpoints.
 * Returns null (no fetch) when url is null, e.g. while auth is still resolving.
 */
export function useApiQuery<T>(url: string | null): UseApiQueryReturn<T> {
  const { data, loading, error, refetch } = useSupabaseQuery<T | null>(async () => {
    if (!url) return null;
    const res = await authFetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }, [url]);

  return {
    data: data ?? null,
    loading,
    error: error ? (error.message ?? String(error)) : null,
    refetch,
  };
}
