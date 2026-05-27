'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ─── Tuning de performance ────────────────────────────────────
            // staleTime alto = no refetch al re-montar el componente o al
            // hacer focus a la ventana. Para datos que no cambian a cada
            // momento (listings, profile, settings) son 5 min.
            staleTime: 5 * 60 * 1000,
            // gcTime alto = el cache vive más tiempo aunque salgas del
            // componente, así volver atrás es instantáneo.
            gcTime: 10 * 60 * 1000,
            // Evitamos refetch innecesarios cuando el usuario:
            // - vuelve a la pestaña (focus)
            // - reconecta el wifi
            // - re-monta el componente porque cambió de tab
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            // Reintentos: 401 no se retrieta (auth roto), 4xx tampoco
            // (es un error del cliente), solo errores de red / 5xx
            retry: (failureCount, error: any) => {
              const status = error?.response?.status ?? error?.status;
              if (status === 401 || status === 403 || status === 404) return false;
              if (status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
          },
          mutations: {
            // En mutations, sólo retrieta errores 5xx y red
            retry: (failureCount, error: any) => {
              const status = error?.response?.status ?? error?.status;
              if (status && status < 500) return false;
              return failureCount < 1;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
