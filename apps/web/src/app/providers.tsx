'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Cache global con log silencioso — no rompe la UI por queries que fallan
        queryCache: new QueryCache({
          onError: (err: any, query) => {
            const status = err?.response?.status ?? err?.status;
            // 401 lo maneja el interceptor de axios (redirige a /login)
            // 404 es válido (recurso no existe → muestra empty state)
            // 4xx en general son del cliente → no es bug, la UI muestra el msg
            if (!status || status >= 500) {
              // Sólo log de errores 5xx o de red — no rompemos la UI
              // eslint-disable-next-line no-console
              console.warn(`[Query failed] ${String(query.queryKey)}`, err?.message);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (err: any) => {
            const status = err?.response?.status ?? err?.status;
            if (!status || status >= 500) {
              // eslint-disable-next-line no-console
              console.warn('[Mutation failed]', err?.message);
            }
          },
        }),
        defaultOptions: {
          queries: {
            // CRÍTICO: NO subir errores HTTP al React error boundary.
            // Cada página los maneja con `isError`/`error` y muestra
            // empty state o mensaje en lugar de romper toda la pantalla.
            throwOnError: false,
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
            // Las mutations tampoco rompen la UI — cada page muestra el error
            // en su propio bloque (alert, toast o inline).
            throwOnError: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
