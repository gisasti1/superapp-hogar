'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { VerificationStatus } from '@superapp/shared';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

const KYC_VARIANT: Record<string, string> = {
  [VerificationStatus.VERIFIED]: 'success',
  [VerificationStatus.IN_PROGRESS]: 'info',
  [VerificationStatus.PENDING]: 'warning',
  [VerificationStatus.REJECTED]: 'error',
};

const KYC_LABELS: Record<string, string> = {
  [VerificationStatus.VERIFIED]: 'Verificado',
  [VerificationStatus.IN_PROGRESS]: 'En progreso',
  [VerificationStatus.PENDING]: 'Sin verificar',
  [VerificationStatus.REJECTED]: 'Rechazado',
};

const editSchema = z.object({
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().optional(),
});
type EditFormData = z.infer<typeof editSchema>;

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const setAuth = useAuthStore(s => s.setAuth);
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    values: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      phone: profile?.phone ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: object) =>
      authApi.me().then(() => dto), // replace with actual update endpoint when available
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setEditing(false);
    },
    onError: () => {
      setError('root', { message: 'Error al guardar los cambios.' });
    },
  });

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const kycStatus: VerificationStatus = profile?.verification?.status ?? profile?.verificationStatus ?? VerificationStatus.PENDING;
  const isVerified = kycStatus === VerificationStatus.VERIFIED;
  const plan = profile?.subscription?.plan ?? 'FREE';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 mt-1">Gestioná tu cuenta y verificación</p>
      </div>

      {isLoading ? (
        <div className="card py-16">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Avatar + name */}
          <div className="card flex items-center gap-5">
            <div className="h-16 w-16 rounded-full bg-brand-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              {profile?.phone && (
                <p className="text-sm text-gray-400 mt-0.5">{profile.phone}</p>
              )}
            </div>
          </div>

          {/* KYC status */}
          <div className="card flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">Verificación de identidad</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {isVerified
                  ? 'Tu identidad está verificada. Podés firmar contratos y emitir pólizas.'
                  : 'Verificá tu identidad para acceder a todas las funciones.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant={KYC_VARIANT[kycStatus]}>
                {KYC_LABELS[kycStatus] ?? kycStatus}
              </Badge>
              {!isVerified && (
                <Link href="/kyc" className="btn-primary text-xs">
                  Verificar →
                </Link>
              )}
            </div>
          </div>

          {/* Subscription */}
          <div className="card flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">Plan</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {plan === 'PREMIUM'
                  ? 'Tenés acceso a todas las funciones premium.'
                  : 'Plan gratuito con funciones básicas.'}
              </p>
              {profile?.subscription?.renewsAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Renueva: {new Date(profile.subscription.renewsAt).toLocaleDateString('es-AR')}
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <Badge variant={plan === 'PREMIUM' ? 'success' : 'neutral'}>
                {plan}
              </Badge>
              {plan !== 'PREMIUM' && (
                <Link href="/premium" className="btn-primary text-xs">
                  Upgrade →
                </Link>
              )}
            </div>
          </div>

          {/* Edit form */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Datos personales</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-brand-600 font-medium hover:underline"
                >
                  Editar
                </button>
              )}
            </div>

            {editing ? (
              <form
                onSubmit={handleSubmit(d => updateMutation.mutate(d))}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nombre</label>
                    <input {...register('firstName')} type="text" className="input" />
                    {errors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Apellido</label>
                    <input {...register('lastName')} type="text" className="input" />
                    {errors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input {...register('phone')} type="tel" className="input" placeholder="+54 11 ..." />
                </div>
                {errors.root && (
                  <p className="text-red-500 text-xs">{errors.root.message}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || updateMutation.isPending}
                    className="btn-primary flex-1"
                  >
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide font-medium">Nombre</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{profile?.firstName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide font-medium">Apellido</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{profile?.lastName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide font-medium">Email</dt>
                  <dd className="mt-1 text-sm text-gray-700">{profile?.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide font-medium">Teléfono</dt>
                  <dd className="mt-1 text-sm text-gray-700">{profile?.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide font-medium">Rol</dt>
                  <dd className="mt-1 text-sm text-gray-700">{profile?.role}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide font-medium">Miembro desde</dt>
                  <dd className="mt-1 text-sm text-gray-700">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString('es-AR')
                      : '—'}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </>
      )}
    </div>
  );
}
