'use client';

/**
 * Error boundary del área autenticada. Mismo contrato que el global:
 * silencioso por default, auto-reset 2 veces, NUNCA desloguea.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

const KNOWN_TRANSIENT = [
  'NEXT_REDIRECT',
  'NEXT_NOT_FOUND',
  'AbortError',
  'The user aborted a request',
  'cancelled',
  'Component unmounted',
];

function isTransient(err?: Error & { digest?: string }) {
  if (!err) return true;
  const msg = String(err.message ?? '');
  const digest = String(err.digest ?? '');
  return KNOWN_TRANSIENT.some(k => msg.includes(k) || digest.includes(k));
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [showUI, setShowUI] = useState(false);
  const retried = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.warn('[DashboardError]', error?.message, error?.digest);

    if (isTransient(error)) {
      reset();
      return;
    }
    if (retried.current < 2) {
      retried.current += 1;
      const t = setTimeout(() => reset(), 400);
      return () => clearTimeout(t);
    }
    setShowUI(true);
  }, [error, reset]);

  if (!showUI) return null;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-habitta-sand p-8 max-w-md w-full text-center space-y-4">
        <div className="text-5xl">😵‍💫</div>
        <h1 className="text-lg font-extrabold text-habitta-deep">No pudimos cargar esta pantalla</h1>
        <p className="text-sm text-habitta-charcoal/80">
          Tu sesión sigue activa. Podés reintentar o volver al inicio.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={() => { retried.current = 0; setShowUI(false); reset(); }}
            className="text-sm font-medium text-habitta-deep border border-habitta-olive/40 px-4 py-2 rounded-lg hover:bg-habitta-sand transition-colors"
          >
            🔄 Reintentar
          </button>
          <button
            onClick={() => router.push(isAuthenticated ? '/dashboard' : '/')}
            className="text-sm font-semibold bg-habitta-terra hover:bg-habitta-earth text-white px-4 py-2 rounded-lg transition-colors"
          >
            🏠 Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
