'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { VerificationStatus } from '@superapp/shared';
import { Avatar } from '@/components/ui/Avatar';
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
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');

  const uploadAvatar = useMutation({
    mutationFn: (f: File) => authApi.uploadAvatar(f),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al subir avatar'),
  });

  const deleteAvatar = useMutation({
    mutationFn: () => authApi.deleteAvatar(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  const saveNickname = useMutation({
    mutationFn: (nickname: string) => authApi.updateProfile({ nickname }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setEditingNickname(false);
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try { await uploadAvatar.mutateAsync(f); } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

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
          <div className="card">
            <div className="flex items-start gap-5 flex-wrap">
              <div className="relative group shrink-0">
                <Avatar
                  url={profile?.avatarUrl}
                  firstName={profile?.firstName}
                  lastName={profile?.lastName}
                  nickname={profile?.nickname}
                  size="xl"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 bg-white border border-gray-300 rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-gray-50 text-sm"
                  title="Cambiar foto"
                >
                  {uploading ? '⏳' : '📷'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900">
                  {profile?.firstName} {profile?.lastName}
                </p>

                {/* Apodo editable inline */}
                {editingNickname ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      autoFocus
                      type="text"
                      maxLength={40}
                      value={nicknameDraft}
                      onChange={e => setNicknameDraft(e.target.value)}
                      placeholder="Apodo (opcional)"
                      className="input text-sm py-1 max-w-xs"
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveNickname.mutate(nicknameDraft.trim());
                        if (e.key === 'Escape') setEditingNickname(false);
                      }}
                    />
                    <button
                      onClick={() => saveNickname.mutate(nicknameDraft.trim())}
                      disabled={saveNickname.isPending}
                      className="text-xs text-brand-600 font-medium"
                    >
                      ✓ Guardar
                    </button>
                    <button
                      onClick={() => setEditingNickname(false)}
                      className="text-xs text-gray-500"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNicknameDraft(profile?.nickname ?? '');
                      setEditingNickname(true);
                    }}
                    className="text-sm text-gray-600 hover:text-brand-600 mt-0.5 inline-flex items-center gap-1"
                  >
                    {profile?.nickname ? (
                      <>👤 <span className="italic">"{profile.nickname}"</span> <span className="text-xs text-gray-400">(editar)</span></>
                    ) : (
                      <span className="text-xs text-gray-400 italic">+ Agregar apodo</span>
                    )}
                  </button>
                )}

                <p className="text-sm text-gray-500 mt-1">{profile?.email}</p>
                {profile?.phone && (
                  <p className="text-sm text-gray-400 mt-0.5">{profile.phone}</p>
                )}

                {profile?.avatarUrl && (
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar la foto de perfil?')) deleteAvatar.mutate();
                    }}
                    className="text-xs text-red-600 hover:underline mt-2"
                  >
                    Eliminar foto
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              📸 Foto JPG/PNG/WEBP, máx 5MB. Cuadrada queda mejor.
            </p>
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

          {/* ─── Zona peligrosa ─── */}
          <DangerZone />
        </>
      )}
    </div>
  );
}

/* ─── Zona peligrosa: dar de baja la cuenta ─────────────────────────── */
function DangerZone() {
  const router = useRouter();
  const clearAuth = useAuthStore(s => s.clearAuth);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.deleteAccount(password, reason || undefined),
    onSuccess: () => {
      clearAuth();
      router.push('/?account-deleted=1');
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error al dar de baja la cuenta'),
  });

  return (
    <div className="card border-red-200 bg-red-50/40 space-y-3">
      <h2 className="font-bold text-red-700 flex items-center gap-2">⚠️ Zona peligrosa</h2>
      <p className="text-sm text-red-700/80">
        Si das de baja tu cuenta, no vas a poder volver a iniciar sesión con este mail (lo liberamos
        para que puedas registrarte de nuevo si querés). <strong>Tu información histórica
        (contratos, pagos, mensajes, reseñas) NO se elimina</strong> — queda preservada para
        cumplir con obligaciones legales y contables.
      </p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-sm font-semibold text-red-600 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors">
          Quiero dar de baja mi cuenta
        </button>
      ) : (
        <div className="space-y-3 bg-white rounded-xl border border-red-200 p-4">
          <div>
            <label className="label">Reconfirmá tu contraseña *</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Para confirmar que sos vos"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">Motivo <span className="text-gray-400 font-normal">(opcional, nos ayuda a mejorar)</span></label>
            <input
              className="input"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: ya no alquilo, encontré otra plataforma…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setOpen(false); setPassword(''); setReason(''); }}
              className="btn-secondary text-sm"
              disabled={mutation.isPending}
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (confirm('¿Estás seguro? Esta acción no se puede deshacer.')) mutation.mutate();
              }}
              disabled={!password || mutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {mutation.isPending ? 'Dando de baja…' : 'Confirmar baja'}
            </button>
          </div>
        </div>
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
