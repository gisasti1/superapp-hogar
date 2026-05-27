'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Email inválido'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.forgotPassword(data.email);
    } catch { /* ignoramos errores — UX uniforme anti-enumeration */ }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-habitta-cream px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-habitta-terra">Habitta</h1>
          <p className="text-gray-500 mt-2">Recuperar contraseña</p>
        </div>

        <div className="card">
          {!sent ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Ingresá tu email y te mandamos un link para resetear tu contraseña.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="input"
                    placeholder="tu@email.com"
                    autoComplete="email"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                  {isSubmitting ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-5xl">📧</div>
              <h2 className="text-lg font-bold text-gray-900">Revisá tu email</h2>
              <p className="text-sm text-gray-600">
                Si el email está registrado, te enviamos un link para resetear tu contraseña.
                El link expira en 1 hora.
              </p>
              <p className="text-xs text-gray-400 pt-2">
                💡 En modo desarrollo el link aparece en los logs del API:<br/>
                <code className="text-[10px]">tail -f .local-db/logs/api.log</code>
              </p>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/login" className="text-habitta-terra font-medium hover:underline">
              ← Volver al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
