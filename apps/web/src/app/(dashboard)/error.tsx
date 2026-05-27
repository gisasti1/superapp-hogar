'use client';

/**
 * Error boundary del área autenticada. Mismo contrato que el global:
 * NO desloguea, vuelve al dashboard y deja la sesión intacta.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[DashboardError]', error?.message, error?.digest);
  }, [error]);

  const handleGoHome = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
        <div className="text-5xl">😵‍💫</div>
        <h1 className="text-lg font-extrabold text-gray-900">No pudimos cargar esta pantalla</h1>
        <p className="text-sm text-gray-500">
          Tu sesión sigue activa. Podés reintentar o volver al inicio.
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
            className="text-sm font-semibold bg-habitta-terra hover:bg-habitta-earth text-white px-4 py-2 rounded-lg transition-colors"
          >
            🏠 Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
