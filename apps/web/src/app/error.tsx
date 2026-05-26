'use client';

/**
 * Error boundary GLOBAL. Atrapa cualquier excepción que se escape
 * de los layouts y páginas.
 *
 * Política:
 *  - Si el usuario tiene sesión activa → lo llevamos al inicio (dashboard)
 *    y NO le tocamos el auth store. Su sesión sigue válida.
 *  - Si no tiene sesión → lo llevamos a la landing pública.
 *  - En ningún caso forzamos un logout. Errores de carga / fetch / runtime
 *    no significan que la sesión se invalidó.
 *
 * Los errores 401 los maneja el interceptor de axios (sí redirige a /login
 * porque ahí la sesión sí está rota).
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    // log para debugging
    // eslint-disable-next-line no-console
    console.error('[GlobalError]', error?.message, error?.digest);
  }, [error]);

  const handleGoHome = () => {
    if (isAuthenticated) {
      // Volver al dashboard sin tocar el auth store
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
        <div className="text-5xl">😵‍💫</div>
        <h1 className="text-xl font-extrabold text-gray-900">Algo no salió bien</h1>
        <p className="text-sm text-gray-500">
          Tuvimos un problema cargando esta página. Tu sesión sigue activa y
          podemos volver al inicio sin perder nada.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="text-sm font-medium text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄 Reintentar
          </button>
          <button
            onClick={handleGoHome}
            className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isAuthenticated ? '🏠 Ir al inicio' : '👋 Volver al inicio'}
          </button>
        </div>
      </div>
    </div>
  );
}
