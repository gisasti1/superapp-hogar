'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';

const schema = z.object({
  newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm: z.string().min(8, 'Mínimo 8 caracteres'),
}).refine(d => d.newPassword === d.confirm, {
  path: ['confirm'],
  message: 'Las contraseñas no coinciden',
});
type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.resetPassword(token, data.newPassword);
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError('root', { message: msg ?? 'No pudimos resetear la contraseña. El link puede haber expirado.' });
    }
  };

  if (!token) {
    return (
      <div className="card text-center space-y-3">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-lg font-bold text-gray-900">Link inválido</h2>
        <p className="text-sm text-gray-600">El link de reseteo no es válido. Pedí uno nuevo.</p>
        <Link href="/forgot-password" className="btn-primary inline-block mt-4">
          Pedir nuevo link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card text-center space-y-3">
        <div className="text-5xl">✅</div>
        <h2 className="text-lg font-bold text-gray-900">Contraseña actualizada</h2>
        <p className="text-sm text-gray-600">Te redirigimos al login en unos segundos...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="text-sm text-gray-600 mb-4">Ingresá tu nueva contraseña.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nueva contraseña</label>
          <input
            {...register('newPassword')}
            type="password"
            className="input"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="label">Confirmar contraseña</label>
          <input
            {...register('confirm')}
            type="password"
            className="input"
            placeholder="Repetí la contraseña"
            autoComplete="new-password"
          />
          {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
        </div>

        {errors.root && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {errors.root.message}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          ← Volver al login
        </Link>
      </p>
    </div>
  );
}

// Cast a `any` para evitar el conflicto de tipos React 19 ↔ react-leaflet
// (Suspense funciona en runtime; sólo el tipo está duplicado entre versiones).
const SuspenseAny = React.Suspense as any;

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-600">SuperApp Hogar</h1>
          <p className="text-gray-500 mt-2">Nueva contraseña</p>
        </div>
        <SuspenseAny fallback={<div className="card text-center text-gray-400">Cargando...</div>}>
          <ResetPasswordForm />
        </SuspenseAny>
      </div>
    </div>
  );
}
