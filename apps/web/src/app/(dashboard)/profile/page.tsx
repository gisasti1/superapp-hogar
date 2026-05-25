'use client';

import { useQuery } from '@tanstack/react-query';
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

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
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

          {/* Datos personales (read-only) — la edición vive en /profile/edit */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Datos personales</h2>
              <Link href="/profile/edit" className="text-sm text-brand-600 font-medium hover:underline">
                Editar →
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Nombre" value={profile?.firstName} />
              <Field label="Apellido" value={profile?.lastName} />
              <Field label="Email" value={profile?.email} />
              <Field label="Teléfono" value={profile?.phone} />
              <Field label="DNI" value={profile?.dni} />
              <Field label="Nacionalidad" value={profile?.nationality} />
              <Field
                label="Fecha de nacimiento"
                value={profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('es-AR') : null}
              />
              <Field label="Rol" value={profile?.role} />
              <Field label="Dirección" value={profile?.address} colSpan={2} />
              <Field label="Ciudad" value={profile?.city} />
              <Field label="Provincia" value={profile?.province} />
              <Field
                label="Miembro desde"
                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('es-AR') : '—'}
              />
            </dl>
          </div>

          {/* Datos profesionales */}
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900">Trabajo e ingresos</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Ocupación" value={profile?.occupation} />
              <Field label="Tipo de empleo" value={profile?.employmentType ? EMPLOYMENT_LABEL[profile.employmentType] ?? profile.employmentType : null} />
              <Field label="Empresa" value={profile?.employer} />
              <Field
                label="Ingresos mensuales"
                value={profile?.monthlyIncome ? `$${Number(profile.monthlyIncome).toLocaleString('es-AR')} ARS` : null}
              />
            </dl>
            {!profile?.occupation && !profile?.employmentType && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                ⚠ Te conviene completar estos datos: aceleran la aprobación de solicitudes de alquiler.
              </p>
            )}
          </div>

          {/* Estilo de vida */}
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900">Estilo de vida</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Estado civil"
                value={profile?.maritalStatus ? MARITAL_LABEL[profile.maritalStatus] ?? profile.maritalStatus : null}
              />
              <Field label="Mascotas" value={profile?.hasPets ? '🐾 Sí' : 'No'} />
              <Field label="Fuma" value={profile?.smoker ? '🚬 Sí' : 'No'} />
            </dl>
            {profile?.bio && (
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wide font-medium">Sobre mí</dt>
                <dd className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{profile.bio}</dd>
              </div>
            )}
          </div>

          {/* Contacto de emergencia */}
          {(profile?.emergencyContactName || profile?.emergencyContactPhone) && (
            <div className="card space-y-2">
              <h2 className="font-bold text-gray-900">Contacto de emergencia</h2>
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Nombre" value={profile?.emergencyContactName} />
                <Field label="Teléfono" value={profile?.emergencyContactPhone} />
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const EMPLOYMENT_LABEL: Record<string, string> = {
  EMPLOYEE: 'Empleado',
  SELF_EMPLOYED: 'Monotributista / autónomo',
  FREELANCER: 'Freelancer',
  BUSINESS_OWNER: 'Empresario',
  STUDENT: 'Estudiante',
  RETIRED: 'Jubilado',
  UNEMPLOYED: 'Desempleado',
  OTHER: 'Otro',
};

const MARITAL_LABEL: Record<string, string> = {
  SINGLE: 'Soltero/a',
  IN_RELATIONSHIP: 'En pareja',
  MARRIED: 'Casado/a',
  DIVORCED: 'Divorciado/a',
  WIDOWED: 'Viudo/a',
  PREFER_NOT_TO_SAY: 'Prefiere no decir',
};

function Field({ label, value, colSpan }: { label: string; value?: string | null; colSpan?: number }) {
  return (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <dt className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</dt>
      <dd className={`mt-1 text-sm ${value ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}`}>
        {value || 'Sin cargar'}
      </dd>
    </div>
  );
}
