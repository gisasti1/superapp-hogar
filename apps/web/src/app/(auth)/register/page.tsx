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

const schema = z
  .object({
    firstName: z.string().min(2, 'Mínimo 2 caracteres'),
    lastName: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[a-z]/, 'Debe tener al menos una minúscula')
      .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
      .regex(/\d/, 'Debe tener al menos un número'),
    confirmPassword: z.string().min(8, 'Repetí la contraseña'),
    phone: z.string().min(8, 'Teléfono requerido (mínimo 8 dígitos)'),
    address: z.string().min(5, 'Dirección requerida (mínimo 5 caracteres)'),
    city: z.string().min(2, 'Ciudad requerida'),
    province: z.string().optional(),
    role: z.nativeEnum(UserRole),
  })
  .refine(d => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

type FormData = z.infer<typeof schema>;

// SVG inline para el ícono ojo / ojo tachado (sin dependencia externa)
const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
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
);

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.TENANT);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: UserRole.TENANT, province: 'Buenos Aires' },
    mode: 'onBlur',
  });

  const password = watch('password') ?? '';

  // Strength meter — para que el usuario sepa qué le falta
  const strength = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
  };
  const strengthScore = Object.values(strength).filter(Boolean).length;

  const handleRoleToggle = (role: UserRole) => {
    setSelectedRole(role);
    setValue('role', role);
  };

  const onSubmit = async (data: FormData) => {
    try {
      // No mandamos confirmPassword al backend (es solo client-side)
      const { confirmPassword, ...payload } = data;
      const res = await authApi.register(payload);
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Error al registrarse');
      setError('root', { message: text });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
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
                <label className="label">Nombre *</label>
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
                <label className="label">Apellido *</label>
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
              <label className="label">Email *</label>
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

            {/* Password con toggle ver/ocultar */}
            <div>
              <label className="label">Contraseña *</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Mínimo 8 chars con A, a y 1"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(n => (
                      <div
                        key={n}
                        className={clsx(
                          'h-1 flex-1 rounded-full transition-colors',
                          strengthScore >= n
                            ? strengthScore <= 2 ? 'bg-red-400'
                              : strengthScore === 3 ? 'bg-amber-400'
                              : 'bg-green-500'
                            : 'bg-gray-200',
                        )}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                    <span className={strength.length ? 'text-green-600' : 'text-gray-400'}>
                      {strength.length ? '✓' : '○'} 8 caracteres
                    </span>
                    <span className={strength.upper ? 'text-green-600' : 'text-gray-400'}>
                      {strength.upper ? '✓' : '○'} 1 mayúscula
                    </span>
                    <span className={strength.lower ? 'text-green-600' : 'text-gray-400'}>
                      {strength.lower ? '✓' : '○'} 1 minúscula
                    </span>
                    <span className={strength.digit ? 'text-green-600' : 'text-gray-400'}>
                      {strength.digit ? '✓' : '○'} 1 número
                    </span>
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="label">Repetir contraseña *</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Tiene que ser igual a la de arriba"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <label className="label">Teléfono *</label>
              <input
                {...register('phone')}
                type="tel"
                className="input"
                placeholder="+54 11 1234-5678"
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="label">Dirección *</label>
              <input
                {...register('address')}
                type="text"
                className="input"
                placeholder="Av. Corrientes 1234, Piso 3 Dto B"
                autoComplete="street-address"
              />
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Ciudad *</label>
                <input
                  {...register('city')}
                  type="text"
                  className="input"
                  placeholder="Buenos Aires"
                  autoComplete="address-level2"
                />
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                )}
              </div>
              <div>
                <label className="label">Provincia</label>
                <input
                  {...register('province')}
                  type="text"
                  className="input"
                  placeholder="Buenos Aires"
                  autoComplete="address-level1"
                />
              </div>
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
