import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carrega dados assíncronos e recarrega quando `deps` mudam.
 * Ignora respostas antigas (se o usuário trocou de mês no meio da requisição).
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableLoad = useCallback(load, deps);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    return stableLoad()
      .then((result) => {
        if (id === requestId.current) setData(result);
      })
      .catch((err: Error) => {
        if (id === requestId.current) setError(err.message);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [stableLoad]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
