import { useState, useEffect, useCallback } from 'react';

export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err: any) {
      setError(err || new Error('Query execution failed'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps -- dependencies is caller-supplied and intentionally variadic
  }, [...dependencies]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}
