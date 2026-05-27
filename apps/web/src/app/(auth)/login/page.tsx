'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense as _Suspense } from 'react';
const Suspense = _Suspense as any;
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { HabittaLogo } from '@/components/HabittaLogo';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Si me empujaron acá con ?next=/ruta/original, después del login redirigir
  // a esa ruta en vez del dashboard. Validamos que sea una ruta relativa (no
  // un URL externo) para evitar open redirect.
  const next = (() => {
    const raw = params.get('next');
    if (!raw) return '';
    try {
      const decoded = decodeURIComponent(raw);
      // Sólo aceptamos paths internos (empiezan con / pero no //)
      if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.startsWith('/http')) {
        return decoded;
      }
    } catch { /* ignore */ }
    return '';
  })();

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data.email, data.password);
      setAuth(res.user, res.accessToken, res.refreshToken);
      // Prioridad 1: si vinieron desde un link directo, volver a esa ruta
      if (next) {
        router.push(next);
        return;
      }
      // Prioridad 2: destino por defecto según el rol
      if (res.user.role === 'PROVIDER') router.push('/provider');
      else if (res.user.role === 'REALTOR') router.push('/realtor');
      else router.push('/dashboard');
    } catch {
      setError('root', { message: 'Email o contraseña incorrectos' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-habitta-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center gap-2">
          <HabittaLogo size={44} color="#C98E5B" accentColor="#7E9081" />
          <p className="text-habitta-charcoal/70 mt-1 text-sm">Iniciá sesión en tu cuenta</p>
        </div>

        {/* Aviso "estás acá porque te empujamos desde un link directo" */}
        {next && (
          <div className="mb-4 bg-habitta-sand border border-habitta-olive/30 rounded-xl px-4 py-3 text-sm text-habitta-deep">
            🔒 Para abrir <span className="font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded">{next}</span> necesitás iniciar sesión. Después te llevamos directo ahí.
          </div>
        )}

        <div className="card">
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

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {errors.root.message}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>

            <p className="text-center text-sm">
              <Link href="/forgot-password" className="text-gray-500 hover:text-habitta-terra hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tenés cuenta?{' '}
            <Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="text-habitta-terra font-medium hover:underline">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
