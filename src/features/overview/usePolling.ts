import { useCallback, useEffect, useRef, useState } from 'react';

export function usePolling<T>(load: () => Promise<T>, intervalMs: number, key = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await loadRef.current();
      if (current !== generation.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (current !== generation.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh();
    const timer = window.setInterval(() => void refresh(), intervalMs);
    return () => window.clearInterval(timer);
  }, [refresh, intervalMs, key]);

  return { data, error, loading, refresh };
}
