'use client';

/**
 * Cuadro informativo amigable para explicar el proceso de verificación
 * de identidad (lo que técnicamente se llama "KYC", pero usamos lenguaje
 * cotidiano para que el usuario no se asuste).
 *
 * Usar en cualquier pantalla donde se le pida al usuario verificar su
 * identidad o donde se mencione "KYC".
 */
export function IdentityCheckExplainer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800 flex items-start gap-2">
        <span>🪪</span>
        <p>
          <strong>Verificación de identidad:</strong> nos ayuda a confirmar que sos vos.
          Sólo nuestro equipo lo ve, no se comparte con terceros.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-blue-100 p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🪪</span>
        <div>
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">¿Qué es esto y por qué te lo pedimos?</h3>
          <p className="text-sm text-gray-700 mt-1">
            Es un paso para <strong>confirmar que sos vos</strong> — lo mismo que hace tu banco cuando abrís
            una cuenta. Nos protege a todos: a vos, al propietario, al inquilino y al prestador del servicio.
          </p>
        </div>
      </div>

      <ul className="text-sm text-gray-700 space-y-1.5 ml-9">
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span><strong>Es rápido</strong> — DNI más una selfie y listo.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span><strong>Es privado</strong> — sólo nuestro equipo legal lo ve, no se comparte con otros usuarios.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span><strong>Es seguro</strong> — usamos cifrado y los datos se guardan de acuerdo a la Ley AR 25.326.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">✓</span>
          <span><strong>Se hace una sola vez</strong> — después de verificar no te lo volvemos a pedir.</span>
        </li>
      </ul>
    </div>
  );
}
