'use client';

// ✅ 신규: 간단한 fetch 훅(꼬임 방지용)
import { useEffect, useState } from 'react';

type ApiState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

export function useApi<T>(url: string) {
  const [state, setState] = useState<ApiState<T>>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setState({ loading: true, error: null, data: null });
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();

        if (!alive) return;

        if (!res.ok || !json?.success) {
          setState({
            loading: false,
            error: json?.message ?? json?.reason ?? 'REQUEST_FAILED',
            data: null,
          });
          return;
        }

        setState({ loading: false, error: null, data: json.data as T });
      } catch (e: any) {
        if (!alive) return;
        setState({ loading: false, error: e?.message ?? 'NETWORK_ERROR', data: null });
      }
    })();

    return () => {
      alive = false;
    };
  }, [url]);

  return state;
}
