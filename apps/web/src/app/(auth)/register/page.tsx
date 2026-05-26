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
import { useT } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { UserRole } from '@superapp/shared';

/* ─── Account types ──────────────────────────────────────────────────────── */
type AccountType = 'TENANT' | 'LANDLORD' | 'PROVIDER' | 'REALTOR' | 'SELF_TENANT';

// Cada tipo trae sólo el id i18n + estilo. Los textos los resuelve useT() en runtime.
const ACCOUNT_TYPES: {
  type: AccountType;
  id: string;              // ej 'tenant', 'landlord', 'self'
  icon: string;
  gradient: string;
  ring: string;
  hasBadge?: boolean;
}[] = [
  { type: 'TENANT',      id: 'tenant',   icon: '🏠', gradient: 'from-blue-50 to-sky-50',     ring: 'ring-blue-500'    },
  { type: 'LANDLORD',    id: 'landlord', icon: '🏢', gradient: 'from-emerald-50 to-teal-50', ring: 'ring-emerald-500' },
  { type: 'PROVIDER',    id: 'provider', icon: '🛠️', gradient: 'from-orange-50 to-amber-50', ring: 'ring-orange-500', hasBadge: true },
  { type: 'REALTOR',     id: 'realtor',  icon: '🏛️', gradient: 'from-purple-50 to-violet-50',ring: 'ring-purple-500', hasBadge: true },
  { type: 'SELF_TENANT', id: 'self',     icon: '🧰', gradient: 'from-rose-50 to-pink-50',    ring: 'ring-rose-500',   hasBadge: true },
];

/* ─── Schema ─────────────────────────────────────────────────────────────── */
const schema = z
  .object({
    firstName:  z.string().min(2, 'Mínimo 2 caracteres'),
    lastName:   z.string().min(2, 'Mínimo 2 caracteres'),
    email:      z.string().email('Email inválido'),
    password:   z.string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[a-z]/, 'Debe incluir minúscula')
      .regex(/[A-Z]/, 'Debe incluir mayúscula')
      .regex(/\d/, 'Debe incluir número'),
    confirmPassword: z.string().min(8),
    phone:      z.string().min(8, 'Teléfono requerido'),
    address:    z.string().min(5, 'Dirección requerida'),
    city:       z.string().min(2, 'Ciudad requerida'),
    province:   z.string().optional(),
    dateOfBirth: z.string().min(10).refine(v => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return age >= 18 && age <= 120;
    }, { message: 'Tenés que tener al menos 18 años' }),
    nationality: z.string().min(2, 'Requerida'),
    occupation: z.string().min(2, 'Requerida'),
    role:       z.nativeEnum(UserRole),
    marketingEmailConsent: z.boolean().optional().default(false),
    marketingSmsConsent:   z.boolean().optional().default(false),
    referralSource: z.string().optional(),
  })
  .refine(d => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

type FormData = z.infer<typeof schema>;

/* ─── Eye icon ───────────────────────────────────────────────────────────── */
const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
    ) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
    )}
  </svg>
);

/* ─── Labels per account type ────────────────────────────────────────────── */
function getLabels(type: AccountType) {
  switch (type) {
    case 'PROVIDER': return {
      addressLabel: 'Dirección base (desde donde trabajás)',
      addressPlaceholder: 'Av. Juan B. Justo 2000, CABA',
      occupationLabel: 'Rubro principal',
      occupationPlaceholder: 'Gasista, Plomero, Electricista…',
      firstNameLabel: 'Nombre del titular / responsable',
      lastNameLabel: 'Apellido del titular',
    };
    case 'REALTOR': return {
      addressLabel: 'Dirección de la oficina / agencia',
      addressPlaceholder: 'Av. Corrientes 1234, CABA',
      occupationLabel: 'Rubro de la agencia',
      occupationPlaceholder: 'Inmobiliaria, Administración de alquileres…',
      firstNameLabel: 'Nombre del responsable / contacto',
      lastNameLabel: 'Apellido del responsable',
    };
    case 'SELF_TENANT': return {
      addressLabel: 'Dirección del inmueble que alquilás',
      addressPlaceholder: 'Av. Corrientes 1234, Piso 3 Dto B',
      occupationLabel: 'Ocupación / profesión',
      occupationPlaceholder: 'Ej: Programador, Médica, Estudiante…',
      firstNameLabel: 'Nombre',
      lastNameLabel: 'Apellido',
    };
    default: return {
      addressLabel: 'Tu dirección particular',
      addressPlaceholder: 'Av. Corrientes 1234, Piso 3 Dto B',
      occupationLabel: 'Ocupación / profesión',
      occupationPlaceholder: 'Ej: Programador, Médica, Estudiante…',
      firstNameLabel: 'Nombre',
      lastNameLabel: 'Apellido',
    };
  }
}

/* ─── Map account type → UserRole real ──────────────────────────────────── */
function mapTypeToRole(type: AccountType): UserRole {
  // SELF_TENANT no es un rol de DB — guardamos TENANT y marcamos selfManagedRental
  if (type === 'SELF_TENANT') return UserRole.TENANT;
  return UserRole[type as Exclude<AccountType, 'SELF_TENANT'>];
}

/* ─── Redirect per type ──────────────────────────────────────────────────── */
function redirectAfterRegister(type: AccountType, role: UserRole): string {
  if (type === 'SELF_TENANT')      return '/my-rental?welcome=1';
  if (role === UserRole.PROVIDER)  return '/provider?welcome=1';
  if (role === UserRole.REALTOR)   return '/realtor?welcome=1';
  return '/dashboard';
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function RegisterPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const t       = useT();

  const [step,         setStep]        = useState<1 | 2>(1);
  const [accountType,  setAccountType] = useState<AccountType>('TENANT');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const labels = getLabels(accountType);

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: UserRole.TENANT, province: 'Buenos Aires', nationality: 'Argentina' },
    mode: 'onBlur',
  });

  const password = watch('password') ?? '';
  const strength = {
    length: password.length >= 8,
    lower:  /[a-z]/.test(password),
    upper:  /[A-Z]/.test(password),
    digit:  /\d/.test(password),
  };
  const strengthScore = Object.values(strength).filter(Boolean).length;

  const handleTypeSelect = (type: AccountType) => {
    setAccountType(type);
    setValue('role', mapTypeToRole(type));
  };

  const onSubmit = async (data: FormData) => {
    try {
      const { confirmPassword, ...payload } = data;
      // El backend acepta selfManagedRental opcional en el dto de register;
      // si no, el flag se setea después en /my-rental al cargar el contrato.
      const extra = accountType === 'SELF_TENANT' ? { selfManagedRental: true } : {};
      const res = await authApi.register({ ...payload, ...extra });
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push(redirectAfterRegister(accountType, res.user.role as UserRole));
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Error al registrarse');
      setError('root', { message: text });
    }
  };

  /* ── Step 1: elegir tipo de cuenta ─────────────────────────────────── */
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Language switcher top-right */}
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white text-2xl shadow-lg mb-4">🏡</div>
            <h1 className="text-2xl font-extrabold text-gray-900">{t('auth.register.title')}</h1>
            <p className="text-gray-500 mt-1">{t('auth.register.subtitle')}</p>
          </div>

          {/* Type cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ACCOUNT_TYPES.map(({ type, id, icon, gradient, ring, hasBadge }) => {
              const selected = accountType === type;
              // El 5to card ("Particular") ocupa fila completa
              const fullRow = type === 'SELF_TENANT';
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeSelect(type)}
                  className={clsx(
                    `relative bg-gradient-to-br ${gradient} rounded-2xl p-5 text-center transition-all duration-200 border-2 flex flex-col items-center justify-center`,
                    fullRow && 'col-span-2',
                    selected ? `border-transparent ring-2 ${ring} shadow-lg scale-[1.02]` : 'border-gray-100 hover:border-gray-200 hover:shadow-md',
                  )}
                >
                  {hasBadge && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wide bg-white/80 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {t(`auth.register.types.${id}.badge`)}
                    </span>
                  )}
                  {selected && (
                    <span className="absolute top-3 left-3 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center text-[10px]">✓</span>
                  )}
                  <span className="text-4xl block mb-2 leading-none">{icon}</span>
                  <p className="font-bold text-gray-900 text-sm leading-tight">{t(`auth.register.types.${id}.title`)}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight max-w-[200px]">{t(`auth.register.types.${id}.subtitle`)}</p>
                </button>
              );
            })}
          </div>

          {/* What you get */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
            {accountType === 'TENANT' && (
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Buscá y filtrá propiedades en tu zona</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Firmá contratos digitales con validez legal</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Pagá el alquiler y seguí tus cuotas</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Pedí servicios del hogar con un clic</li>
              </ul>
            )}
            {accountType === 'LANDLORD' && (
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Publicá propiedades y recibí solicitudes</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Gestioná contratos y cobros en un lugar</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Depósito en garantía digital</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Resolución de conflictos asistida por IA</li>
              </ul>
            )}
            {accountType === 'PROVIDER' && (
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-center gap-2"><span className="text-orange-500">✓</span> Creá tu perfil profesional en minutos</li>
                <li className="flex items-center gap-2"><span className="text-orange-500">✓</span> Recibí pedidos de propietarios e inquilinos</li>
                <li className="flex items-center gap-2"><span className="text-orange-500">✓</span> Subí tu matrícula y DNI para verificarte (es como abrir una cuenta de banco)</li>
                <li className="flex items-center gap-2"><span className="text-orange-500">✓</span> Mostrá tu portfolio de trabajos terminados</li>
              </ul>
            )}
            {accountType === 'REALTOR' && (
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-center gap-2"><span className="text-purple-500">✓</span> Perfil de agencia con matrícula CUCICBA</li>
                <li className="flex items-center gap-2"><span className="text-purple-500">✓</span> Publicá y gestioná propiedades de clientes</li>
                <li className="flex items-center gap-2"><span className="text-purple-500">✓</span> Dashboard de contratos e ingresos centralizado</li>
                <li className="flex items-center gap-2"><span className="text-purple-500">✓</span> Suscripción REALTOR con funciones extendidas</li>
              </ul>
            )}
            {accountType === 'SELF_TENANT' && (
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-center gap-2"><span className="text-rose-500">✓</span> Cargá los datos de tu contrato (propietario, monto, vencimiento)</li>
                <li className="flex items-center gap-2"><span className="text-rose-500">✓</span> Registrá cada pago mensual y guardá comprobantes</li>
                <li className="flex items-center gap-2"><span className="text-rose-500">✓</span> Pedí servicios del hogar a prestadores verificados</li>
                <li className="flex items-center gap-2"><span className="text-rose-500">✓</span> Recordatorios automáticos antes del vencimiento</li>
              </ul>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            className="btn-primary w-full text-base py-3"
          >
            {t('auth.register.continueAs')} {t(`auth.register.types.${ACCOUNT_TYPES.find(x => x.type === accountType)?.id}.title`)} →
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            {t('auth.register.alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-brand-600 font-semibold hover:underline">{t('auth.register.login')}</Link>
          </p>
        </div>
      </div>
    );
  }

  /* ── Step 2: formulario de datos ────────────────────────────────────── */
  const cfg = ACCOUNT_TYPES.find(x => x.type === accountType)!;
  const cfgTitle = t(`auth.register.types.${cfg.id}.title`);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:shadow-sm transition"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{cfg.icon}</span>
              <p className="font-extrabold text-gray-900">{cfgTitle}</p>
            </div>
            <p className="text-xs text-gray-500">Completá tus datos para crear la cuenta</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-emerald-400" />
          <div className="flex-1 h-1.5 rounded-full bg-brand-500" />
          <span className="text-xs text-gray-400 font-medium">Paso 2 de 2</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register('role')} />

            {/* Nombre y apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{labels.firstNameLabel} *</label>
                <input {...register('firstName')} type="text" className="input" placeholder="Juan" autoComplete="given-name" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">{labels.lastNameLabel} *</label>
                <input {...register('lastName')} type="text" className="input" placeholder="Pérez" autoComplete="family-name" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email *</label>
              <input {...register('email')} type="email" className="input" placeholder="tu@email.com" autoComplete="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Contraseña *</label>
              <div className="relative">
                <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="Mínimo 8 chars, A, a y 1" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(n => (
                      <div key={n} className={clsx('h-1 flex-1 rounded-full transition-colors',
                        strengthScore >= n ? (strengthScore <= 2 ? 'bg-red-400' : strengthScore === 3 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-gray-200'
                      )} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-[10px]">
                    {[
                      [strength.length, '8 caracteres'],
                      [strength.upper, '1 mayúscula'],
                      [strength.lower, '1 minúscula'],
                      [strength.digit, '1 número'],
                    ].map(([ok, label]) => (
                      <span key={label as string} className={ok ? 'text-emerald-600' : 'text-gray-400'}>
                        {ok ? '✓' : '○'} {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirmar */}
            <div>
              <label className="label">Repetir contraseña *</label>
              <div className="relative">
                <input {...register('confirmPassword')} type={showConfirm ? 'text' : 'password'} className="input pr-10" placeholder="Igual que la de arriba" autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {/* Teléfono */}
            <div>
              <label className="label">Teléfono *</label>
              <input {...register('phone')} type="tel" className="input" placeholder="+54 11 1234-5678" autoComplete="tel" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            {/* Dirección + ciudad */}
            <div>
              <label className="label">{labels.addressLabel} *</label>
              <input {...register('address')} type="text" className="input" placeholder={labels.addressPlaceholder} autoComplete="street-address" />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Ciudad *</label>
                <input {...register('city')} type="text" className="input" placeholder="Buenos Aires" autoComplete="address-level2" />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <label className="label">Provincia</label>
                <input {...register('province')} type="text" className="input" placeholder="Buenos Aires" autoComplete="address-level1" />
              </div>
            </div>

            {/* Fecha nacimiento + nacionalidad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">
                  {accountType === 'REALTOR' ? 'Fecha nacimiento del titular' : 'Fecha de nacimiento'} *
                </label>
                <input {...register('dateOfBirth')} type="date" className="input" autoComplete="bday"
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)} />
                {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>}
              </div>
              <div>
                <label className="label">Nacionalidad *</label>
                <input {...register('nationality')} type="text" className="input" placeholder="Argentina" />
                {errors.nationality && <p className="text-red-500 text-xs mt-1">{errors.nationality.message}</p>}
              </div>
            </div>

            {/* Ocupación (label varía por tipo) */}
            <div>
              <label className="label">{labels.occupationLabel} *</label>
              <input {...register('occupation')} type="text" className="input" placeholder={labels.occupationPlaceholder} />
              {errors.occupation && <p className="text-red-500 text-xs mt-1">{errors.occupation.message}</p>}
            </div>

            {/* Cómo te enteraste */}
            <div>
              <label className="label">¿Cómo te enteraste? <span className="text-gray-400 font-normal">(opcional)</span></label>
              <select {...register('referralSource')} className="input">
                <option value="">Elegí una opción</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="google">Google</option>
                <option value="amigo">Un amigo o colega</option>
                <option value="tv">TV / radio</option>
                <option value="diario">Diario / revista</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Consentimientos */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs text-gray-500 font-semibold">Comunicaciones <span className="font-normal">(podés cambiarlas después)</span></p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" {...register('marketingEmailConsent')} className="mt-0.5 w-4 h-4 accent-brand-600" />
                <span className="text-xs text-gray-600">
                  📧 Novedades, tips y promociones por <strong>email</strong>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" {...register('marketingSmsConsent')} className="mt-0.5 w-4 h-4 accent-brand-600" />
                <span className="text-xs text-gray-600">
                  📱 Alertas importantes por <strong>SMS</strong>
                </span>
              </label>
              <p className="text-[10px] text-gray-400">Ley AR 25.326 — podés revocar en cualquier momento desde tu perfil.</p>
            </div>

            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                {errors.root.message}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-base">
              {isSubmitting ? 'Creando cuenta…' : `Crear cuenta ${cfg.icon}`}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-brand-600 font-semibold hover:underline">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  );
}
