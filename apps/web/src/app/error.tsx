'use client';

/**
 * Error boundary GLOBAL.
 *
 * Política revisada:
 *  - NO mostramos pantalla de error por cualquier excepción.
 *  - Auto-reset silencioso 2 veces antes de mostrar nada al usuario.
 *  - Filtramos errores conocidos que no son problemas reales:
 *      · NEXT_REDIRECT (es Next haciendo un redirect)
 *      · NEXT_NOT_FOUND (es Next mostrando 404)
 *      · errores de cancelación de fetch (componente desmontado)
 *      · errores de red 401/403 (los maneja el interceptor)
 *  - Sólo si después de auto-reset el error PERSISTE mostramos el modal.
 *  - Nunca tocamos el auth store.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

// Errores que Next.js o el navegador tiran pero NO son fallas reales
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

export default function GlobalError({
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
    // Log mínimo a consola (no es bug crítico salvo que se vea en producción)
    // eslint-disable-next-line no-console
    console.warn('[GlobalError]', error?.message, error?.digest);

    // Caso 1: error transitorio conocido → reset silencioso
    if (isTransient(error)) {
      reset();
      return;
    }

    // Caso 2: intentar 2 auto-resets antes de mostrar la pantalla
    if (retried.current < 2) {
      retried.current += 1;
      const t = setTimeout(() => reset(), 400);
      return () => clearTimeout(t);
    }

    // Caso 3: ya intentamos 2 veces y sigue fallando → mostrar al usuario
    setShowUI(true);
  }, [error, reset]);

  if (!showUI) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-habitta-cream px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-habitta-sand p-8 max-w-md w-full text-center space-y-4">
        <div className="text-5xl">😵‍💫</div>
        <h1 className="text-xl font-extrabold text-habitta-deep">Algo no salió bien</h1>
        <p className="text-sm text-habitta-charcoal/80">
          Tuvimos un problema cargando esta página. Tu sesión sigue activa.
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
            {isAuthenticated ? '🏠 Ir al inicio' : '👋 Volver al inicio'}
          </button>
        </div>
      </div>
    </div>
  );
}
