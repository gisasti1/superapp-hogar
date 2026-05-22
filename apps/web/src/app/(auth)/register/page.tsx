'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clsx } from 'clsx';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@superapp/shared';

const schema = z.object({
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.TENANT);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: UserRole.TENANT },
  });

  const handleRoleToggle = (role: UserRole) => {
    setSelectedRole(role);
    setValue('role', role);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.register(data);
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al registrarse. Intentá de nuevo.';
      setError('root', { message: msg });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-600">SuperApp Hogar</h1>
          <p className="text-gray-500 mt-2">Creá tu cuenta gratis</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role toggle */}
            <div>
              <label className="label">Soy</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleToggle(UserRole.TENANT)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 text-sm font-medium transition-colors',
                    selectedRole === UserRole.TENANT
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300',
                  )}
                >
                  <span className="text-xl">🏠</span>
                  Inquilino
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleToggle(UserRole.LANDLORD)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 text-sm font-medium transition-colors',
                    selectedRole === UserRole.LANDLORD
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300',
                  )}
                >
                  <span className="text-xl">🏢</span>
                  Propietario
                </button>
              </div>
              <input type="hidden" {...register('role')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre</label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="input"
                  placeholder="Juan"
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="label">Apellido</label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="input"
                  placeholder="Pérez"
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="tu@email.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                {...register('phone')}
                type="tel"
                className="input"
                placeholder="+54 11 1234-5678"
                autoComplete="tel"
              />
            </div>

            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {errors.root.message}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
