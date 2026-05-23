'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data.email, data.password);
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('root', { message: 'Email o contraseña incorrectos' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-600">SuperApp Hogar</h1>
          <p className="text-gray-500 mt-2">Iniciá sesión en tu cuenta</p>
        </div>

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
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
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
              <Link href="/forgot-password" className="text-gray-500 hover:text-brand-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-brand-600 font-medium hover:underline">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
