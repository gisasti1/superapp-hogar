'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kycApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function KycPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [dni, setDni] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: kycApi.getStatus,
  });

  const { mutate: verify, isPending } = useMutation({
    mutationFn: () => kycApi.quickVerify(dni.replace(/\D/g, '')),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['kyc-status'] });
      await qc.invalidateQueries({ queryKey: ['me'] });
      setTimeout(() => router.push('/dashboard'), 1500);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'No pudimos verificar tu identidad'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{7,9}$/.test(dni.replace(/\D/g, ''))) {
      setError('Ingresá un DNI válido (entre 7 y 9 dígitos)');
      return;
    }
    verify();
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  const isVerified = status?.status === 'VERIFIED';

  if (isVerified) {
    return (
      <div className="max-w-xl">
        <div className="card text-center space-y-3 py-12">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold text-gray-900">Identidad verificada</h1>
          <p className="text-gray-600">
            Tu cuenta está verificada. Podés firmar contratos, contratar pólizas y operar con normalidad.
          </p>
          {status.verifiedAt && (
            <p className="text-xs text-gray-400">
              Verificado el {new Date(status.verifiedAt).toLocaleDateString('es-AR')}
            </p>
          )}
          <Link href="/dashboard" className="btn-primary inline-block mt-4">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verificá tu identidad</h1>
        <p className="text-gray-500 mt-1">
          Para firmar contratos digitales y contratar seguros necesitamos verificar tu identidad.
        </p>
      </div>

      <div className="card">
        <div className="flex items-start gap-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <span className="text-xl">⚡</span>
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">Modo demo activo</p>
            <p className="text-amber-800">
              En esta instalación local no se valida realmente contra RENAPER —
              alcanza con ingresar un DNI para marcar tu cuenta como verificada.
              En producción te pediríamos foto del DNI + selfie.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="label">DNI</label>
            <input
              type="text"
              inputMode="numeric"
              className="input text-lg"
              placeholder="32.123.456"
              value={dni}
              onChange={e => setDni(e.target.value)}
              maxLength={12}
            />
            <p className="text-xs text-gray-400 mt-1">
              Ingresá tu DNI sin puntos (ej: 32123456)
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Verificando...' : '✓ Verificar identidad'}
            </button>
            <Link href="/dashboard" className="btn-secondary">Cancelar</Link>
          </div>
        </form>
      </div>

      <div className="card bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">¿Qué se desbloquea al verificarse?</h3>
        <ul className="space-y-1.5 text-sm text-gray-600">
          <li>✓ Firmar contratos digitales con validez legal</li>
          <li>✓ Contratar pólizas de caución</li>
          <li>✓ Recibir pagos como propietario</li>
          <li>✓ Abrir casos de mediación</li>
        </ul>
      </div>
    </div>
  );
}
