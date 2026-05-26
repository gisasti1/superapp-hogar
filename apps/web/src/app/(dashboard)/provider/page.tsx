'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi, providerAccountApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const CATEGORIES = [
  { id: 'PLUMBER', label: '🚰 Plomero' },
  { id: 'ELECTRICIAN', label: '⚡ Electricista' },
  { id: 'GAS', label: '🔥 Gasista' },
  { id: 'PAINTER', label: '🎨 Pintor' },
  { id: 'CARPENTER', label: '🪚 Carpintero' },
  { id: 'LOCKSMITH', label: '🔑 Cerrajero' },
  { id: 'AC_TECHNICIAN', label: '❄️ Aire / refrigeración' },
  { id: 'CLEANER', label: '🧹 Limpieza' },
  { id: 'GARDENER', label: '🌿 Jardinería' },
  { id: 'MOVER', label: '📦 Mudanzas' },
  { id: 'PEST_CONTROL', label: '🪳 Control de plagas' },
  { id: 'APPLIANCE_REPAIR', label: '🔌 Reparación electrodomésticos' },
  { id: 'GENERAL', label: '🛠 Servicios generales' },
];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  NOT_STARTED:   { label: 'No iniciado',  color: 'bg-gray-100 text-gray-700' },
  PENDING:       { label: 'Pendiente',    color: 'bg-yellow-100 text-yellow-800' },
  UNDER_REVIEW:  { label: 'En revisión',  color: 'bg-blue-100 text-blue-800' },
  VERIFIED:      { label: 'Verificado ✓', color: 'bg-green-100 text-green-800' },
  REJECTED:      { label: 'Rechazado',    color: 'bg-red-100 text-red-800' },
  NOT_REQUIRED:  { label: 'No requerido', color: 'bg-gray-100 text-gray-600' },
  EXPIRED:       { label: 'Vencido',      color: 'bg-orange-100 text-orange-800' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${s.color}`}>
      {s.label}
    </span>
  );
}

export default function ProviderProfilePage() {
  const qc = useQueryClient();

  const { data: onboarding, isLoading } = useQuery({
    queryKey: ['provider-onboarding'],
    queryFn: providerAccountApi.getOnboarding,
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  // Si todavía no creó el perfil básico, sólo mostramos esa primera sección.
  if (!onboarding?.exists) {
    return <BasicProfileForm isNew onSaved={() => qc.invalidateQueries({ queryKey: ['provider-onboarding'] })} />;
  }

  const provider = onboarding.provider;
  const steps = onboarding.steps;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi cuenta de prestador</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Completá todos los pasos para aparecer como prestador <strong>verificado</strong> en el
          marketplace y empezar a recibir trabajos.
        </p>
      </div>

      <OnboardingProgress onboarding={onboarding} />

      <BasicProfileForm
        isNew={false}
        existing={provider}
        onSaved={() => qc.invalidateQueries({ queryKey: ['provider-onboarding'] })}
      />

      <PersonalDataSection provider={provider} done={steps.personalData} />

      <PayoutAccountSection provider={provider} done={steps.payoutAccount} />

      <KycSection provider={provider} done={steps.kyc} />

      {onboarding.requiresLicense && (
        <LicenseSection provider={provider} done={steps.license} />
      )}

      <PortfolioSection provider={provider} />

      <InsuranceSection provider={provider} />

      <PricingSection provider={provider} />
    </div>
  );
}

// ─── Progreso de onboarding ───────────────────────────────────────────────

function OnboardingProgress({ onboarding }: { onboarding: any }) {
  const { steps, progress, complete, requiresLicense } = onboarding;
  const items = [
    { key: 'basicProfile',  label: 'Perfil del negocio',  done: steps.basicProfile },
    { key: 'personalData',  label: 'Datos personales',    done: steps.personalData },
    { key: 'payoutAccount', label: 'Cuenta de cobro',     done: steps.payoutAccount },
    { key: 'kyc',           label: 'Verificación de identidad', done: steps.kyc },
    ...(requiresLicense
      ? [{ key: 'license', label: 'Matrícula profesional', done: steps.license }]
      : []),
  ];

  return (
    <div className={`card ${complete ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">
            {complete ? '✅ Cuenta verificada' : `⏳ Onboarding: ${progress}% completo`}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {complete
              ? 'Tu cuenta cumple todos los requisitos. Ya podés recibir trabajos.'
              : 'Completá los pasos faltantes para empezar a recibir trabajos verificados.'}
          </p>
        </div>
        <div className="text-2xl font-bold tabular-nums">{progress}%</div>
      </div>
      <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-brand-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map(item => (
          <li key={item.key} className="flex items-center gap-2">
            <span className={item.done ? 'text-green-600' : 'text-gray-400'}>
              {item.done ? '✓' : '○'}
            </span>
            <span className={item.done ? 'text-gray-700 line-through' : 'text-gray-700'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Sección 1: perfil básico del negocio ─────────────────────────────────

function BasicProfileForm({
  isNew,
  existing,
  onSaved,
}: {
  isNew: boolean;
  existing?: any;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    businessName: existing?.businessName ?? '',
    category: existing?.category ?? 'PLUMBER',
    description: existing?.description ?? '',
    citiesInput: (existing?.cities ?? []).join(', '),
    isActive: existing?.isActive ?? true,
    yearsOfExperience: existing?.yearsOfExperience ?? '',
    emergency24h: existing?.emergency24h ?? false,
  });
  const [saved, setSaved] = useState(false);

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: () =>
      servicesApi.upsertMyProviderProfile({
        businessName: form.businessName.trim(),
        category: form.category,
        description: form.description.trim() || undefined,
        cities: form.citiesInput.split(',').map((c: string) => c.trim()).filter(Boolean),
        isActive: form.isActive,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
        emergency24h: form.emergency24h,
      }),
    onSuccess: () => {
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const errMsg = (error as any)?.response?.data?.message;
  const errStr = Array.isArray(errMsg) ? errMsg.join(' · ') : errMsg;

  return (
    <form
      onSubmit={e => { e.preventDefault(); save(); }}
      className="card space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          {isNew ? '📋 Datos del negocio' : '📋 Perfil del negocio'}
        </h2>
      </div>

      {errStr && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {errStr}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
          ✓ Guardado correctamente
        </div>
      )}

      <div>
        <label className="label">Nombre comercial *</label>
        <input
          className="input"
          placeholder="Ej: Plomería del Centro, Electricista Juan Pérez"
          value={form.businessName}
          onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
          required minLength={3} maxLength={80}
        />
      </div>

      <div>
        <label className="label">Categoría *</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setForm(f => ({ ...f, category: c.id }))}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                form.category === c.id
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {['GAS', 'ELECTRICIAN', 'AC_TECHNICIAN'].includes(form.category) && (
          <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠️ Esta categoría requiere matrícula profesional. La vas a cargar más abajo.
          </p>
        )}
      </div>

      <div>
        <label className="label">Ciudades / zonas donde trabajás *</label>
        <input
          className="input"
          placeholder="Capital Federal, San Isidro, Vicente López"
          value={form.citiesInput}
          onChange={e => setForm(f => ({ ...f, citiesInput: e.target.value }))}
          required
        />
        <p className="text-xs text-gray-400 mt-1">Separá con comas.</p>
      </div>

      <div>
        <label className="label">Descripción</label>
        <textarea
          className="input min-h-[100px]"
          placeholder="Contá tu experiencia, qué servicios específicos ofrecés, certificaciones, horarios..."
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          maxLength={2000}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Años de experiencia</label>
          <input
            type="number"
            min={0} max={70}
            className="input"
            value={form.yearsOfExperience}
            onChange={e => setForm(f => ({ ...f, yearsOfExperience: e.target.value }))}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={form.emergency24h}
              onChange={e => setForm(f => ({ ...f, emergency24h: e.target.checked }))}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm text-gray-700">Atiendo emergencias 24hs</span>
          </label>
        </div>
      </div>

      {!isNew && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm text-gray-700">
              Perfil activo (los clientes pueden contactarme)
            </span>
          </label>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Guardando...' : isNew ? 'Crear mi perfil' : 'Guardar cambios'}
        </button>
        {!isNew && (
          <Link href="/services" className="btn-secondary">Ver marketplace</Link>
        )}
      </div>
    </form>
  );
}

// ─── Sección 2: datos personales / fiscales ───────────────────────────────

function PersonalDataSection({ provider, done }: { provider: any; done: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    documentType: provider?.documentType ?? 'DNI',
    documentNumber: provider?.documentNumber ?? '',
    contactPhone: provider?.contactPhone ?? '',
    birthDate: provider?.birthDate ? provider.birthDate.slice(0, 10) : '',
  });
  const [saved, setSaved] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => providerAccountApi.updatePersonalData({
      documentType: form.documentType as any,
      documentNumber: form.documentNumber,
      contactPhone: form.contactPhone || undefined,
      birthDate: form.birthDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-onboarding'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const errMsg = (error as any)?.response?.data?.message;
  const errStr = Array.isArray(errMsg) ? errMsg.join(' · ') : errMsg;

  return (
    <details className="card" open={!done}>
      <summary className="cursor-pointer flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          {done ? '✅' : '○'} 👤 Datos personales / fiscales
        </h2>
        <span className="text-xs text-gray-500">{done ? 'Completo' : 'Requerido'}</span>
      </summary>

      <form onSubmit={e => { e.preventDefault(); mutate(); }} className="space-y-4 mt-4">
        {errStr && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {errStr}
          </div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
            ✓ Datos guardados
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo de documento *</label>
            <select
              className="input"
              value={form.documentType}
              onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))}
            >
              <option value="DNI">DNI (persona física)</option>
              <option value="CUIT">CUIT (autónomo / empresa)</option>
              <option value="CUIL">CUIL (relación de dependencia)</option>
            </select>
          </div>
          <div>
            <label className="label">Número *</label>
            <input
              className="input"
              value={form.documentNumber}
              onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value.replace(/\D/g, '') }))}
              placeholder={form.documentType === 'DNI' ? '12345678' : '20123456789'}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Sólo números, sin guiones.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Teléfono del negocio</label>
            <input
              className="input"
              type="tel"
              value={form.contactPhone}
              onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
              placeholder="+54 9 11 5566-7788"
            />
          </div>
          {form.documentType === 'DNI' && (
            <div>
              <label className="label">Fecha de nacimiento *</label>
              <input
                className="input"
                type="date"
                value={form.birthDate}
                onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
              />
            </div>
          )}
        </div>

        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Guardando...' : 'Guardar datos'}
        </button>
      </form>
    </details>
  );
}

// ─── Sección 3: cuenta de cobro ───────────────────────────────────────────

function PayoutAccountSection({ provider, done }: { provider: any; done: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    payoutMethod: provider?.payoutMethod ?? 'BANK_TRANSFER',
    cbu: provider?.cbu ?? '',
    cvu: provider?.cvu ?? '',
    bankAlias: provider?.bankAlias ?? '',
    bankName: provider?.bankName ?? '',
    bankAccountHolder: provider?.bankAccountHolder ?? '',
    bankAccountHolderId: provider?.bankAccountHolderId ?? '',
    mpAccountId: provider?.mpAccountId ?? '',
  });
  const [saved, setSaved] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => providerAccountApi.updatePayoutAccount({
      payoutMethod: form.payoutMethod as any,
      cbu: form.cbu || undefined,
      cvu: form.cvu || undefined,
      bankAlias: form.bankAlias || undefined,
      bankName: form.bankName || undefined,
      bankAccountHolder: form.bankAccountHolder || undefined,
      bankAccountHolderId: form.bankAccountHolderId || undefined,
      mpAccountId: form.mpAccountId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-onboarding'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const errMsg = (error as any)?.response?.data?.message;
  const errStr = Array.isArray(errMsg) ? errMsg.join(' · ') : errMsg;

  return (
    <details className="card" open={!done}>
      <summary className="cursor-pointer flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          {done ? '✅' : '○'} 💳 Cuenta donde recibo los pagos
        </h2>
        <span className="text-xs text-gray-500">
          {provider?.payoutVerified ? 'Verificada por admin' : done ? 'Cargada' : 'Requerido'}
        </span>
      </summary>

      <form onSubmit={e => { e.preventDefault(); mutate(); }} className="space-y-4 mt-4">
        {errStr && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {errStr}
          </div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
            ✓ Cuenta guardada. Un admin la va a verificar para que puedas recibir pagos.
          </div>
        )}

        <div>
          <label className="label">Método de cobro *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { v: 'BANK_TRANSFER', l: '🏦 Transferencia (CBU)' },
              { v: 'CVU', l: '💼 Cuenta virtual (CVU)' },
              { v: 'MERCADOPAGO', l: '💸 Mercado Pago' },
            ].map(o => (
              <button
                key={o.v}
                type="button"
                onClick={() => setForm(f => ({ ...f, payoutMethod: o.v }))}
                className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
                  form.payoutMethod === o.v
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {form.payoutMethod === 'BANK_TRANSFER' && (
          <>
            <div>
              <label className="label">CBU * (22 dígitos)</label>
              <input
                className="input font-mono"
                value={form.cbu}
                onChange={e => setForm(f => ({ ...f, cbu: e.target.value.replace(/\D/g, '').slice(0, 22) }))}
                placeholder="0070123456789012345678"
                maxLength={22}
              />
              <p className="text-xs text-gray-400 mt-1">{form.cbu.length}/22 dígitos</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Banco</label>
                <input className="input" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="Banco Galicia" />
              </div>
              <div>
                <label className="label">Alias bancario</label>
                <input className="input" value={form.bankAlias} onChange={e => setForm(f => ({ ...f, bankAlias: e.target.value }))} placeholder="plomero.del.centro" />
              </div>
            </div>
          </>
        )}

        {form.payoutMethod === 'CVU' && (
          <>
            <div>
              <label className="label">CVU * (22 dígitos)</label>
              <input
                className="input font-mono"
                value={form.cvu}
                onChange={e => setForm(f => ({ ...f, cvu: e.target.value.replace(/\D/g, '').slice(0, 22) }))}
                placeholder="0000003100012345678901"
                maxLength={22}
              />
              <p className="text-xs text-gray-400 mt-1">{form.cvu.length}/22 dígitos</p>
            </div>
            <div>
              <label className="label">Alias</label>
              <input className="input" value={form.bankAlias} onChange={e => setForm(f => ({ ...f, bankAlias: e.target.value }))} placeholder="alias.de.tu.cuenta" />
            </div>
          </>
        )}

        {form.payoutMethod === 'MERCADOPAGO' && (
          <div>
            <label className="label">ID de cuenta Mercado Pago *</label>
            <input
              className="input font-mono"
              value={form.mpAccountId}
              onChange={e => setForm(f => ({ ...f, mpAccountId: e.target.value }))}
              placeholder="123456789"
            />
            <p className="text-xs text-gray-400 mt-1">
              Lo encontrás en MP → Tu perfil → Datos personales.
            </p>
          </div>
        )}

        {form.payoutMethod !== 'MERCADOPAGO' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Titular de la cuenta *</label>
              <input className="input" value={form.bankAccountHolder} onChange={e => setForm(f => ({ ...f, bankAccountHolder: e.target.value }))} placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="label">CUIT/CUIL del titular</label>
              <input
                className="input"
                value={form.bankAccountHolderId}
                onChange={e => setForm(f => ({ ...f, bankAccountHolderId: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                placeholder="20123456789"
                maxLength={11}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
          🔒 Esta info es <strong>privada</strong>. La usamos sólo para liquidarte los pagos.
          Tras guardar, un admin verifica que la cuenta sea real antes de habilitar cobros.
        </p>

        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Guardando...' : 'Guardar cuenta'}
        </button>
      </form>
    </details>
  );
}

// ─── Sección 4: KYC (verificación de identidad) ───────────────────────────

function FileUploadField({
  label,
  url,
  onUpload,
}: {
  label: string;
  url?: string | null;
  onUpload: (file: File) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      {url ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-700">✓ Cargado</span>
          <a href={url} target="_blank" rel="noopener" className="text-xs text-brand-600 underline">
            Ver
          </a>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-2">Todavía no cargado</p>
      )}
      <label className="block mt-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          disabled={uploading}
          onChange={async e => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUploading(true);
            try { await onUpload(f); } finally { setUploading(false); }
            e.target.value = '';
          }}
        />
        {uploading && <p className="text-xs text-gray-500 mt-1">Subiendo...</p>}
      </label>
    </div>
  );
}

function KycSection({ provider, done }: { provider: any; done: boolean }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['provider-onboarding'] });

  const upFront    = useMutation({ mutationFn: (f: File) => providerAccountApi.uploadIdFront(f), onSuccess: invalidate });
  const upBack     = useMutation({ mutationFn: (f: File) => providerAccountApi.uploadIdBack(f),  onSuccess: invalidate });
  const upSelfie   = useMutation({ mutationFn: (f: File) => providerAccountApi.uploadSelfie(f),  onSuccess: invalidate });
  const submitKyc  = useMutation({ mutationFn: () => providerAccountApi.submitKyc(),             onSuccess: invalidate });

  const canSubmit =
    provider.idDocumentFrontUrl && provider.idDocumentBackUrl && provider.selfieUrl
    && (provider.kycStatus === 'PENDING' || provider.kycStatus === 'REJECTED');

  return (
    <details className="card" open={!done}>
      <summary className="cursor-pointer flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          {done ? '✅' : '○'} 🪪 Verificación de identidad
        </h2>
        <StatusBadge status={provider.kycStatus} />
      </summary>

      <div className="space-y-4 mt-4">
        <p className="text-sm text-gray-600">
          Necesitamos verificar que sos quien decís ser — lo mismo que hace tu banco al abrirte una cuenta.
          Subí las fotos abajo y enviá a revisión. Un admin las valida en 24-48hs hábiles.
          <br />
          <span className="text-xs text-gray-400">
            🔒 Solo nuestro equipo lo ve, no se comparte con otros usuarios. Datos guardados según Ley AR 25.326.
          </span>
        </p>

        {provider.kycStatus === 'REJECTED' && provider.kycRejectionReason && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            <strong>Tu envío anterior fue rechazado:</strong> {provider.kycRejectionReason}
            <br />Subí los documentos correctamente y reenvía a revisión.
          </div>
        )}

        {provider.kycStatus === 'UNDER_REVIEW' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-3">
            ⏳ Tu verificación está en revisión. Te avisamos cuando termine (24-48hs hábiles).
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FileUploadField
            label="DNI / CUIT frente"
            url={provider.idDocumentFrontUrl}
            onUpload={async f => { await upFront.mutateAsync(f); }}
          />
          <FileUploadField
            label="DNI / CUIT dorso"
            url={provider.idDocumentBackUrl}
            onUpload={async f => { await upBack.mutateAsync(f); }}
          />
          <FileUploadField
            label="Selfie con DNI en mano"
            url={provider.selfieUrl}
            onUpload={async f => { await upSelfie.mutateAsync(f); }}
          />
        </div>

        <p className="text-xs text-gray-500">
          📸 Fotos nítidas, con buena luz, todo el documento visible. La selfie tiene que mostrar
          tu cara y el DNI claramente en la misma toma.
        </p>

        <button
          type="button"
          onClick={() => submitKyc.mutate()}
          disabled={!canSubmit || submitKyc.isPending}
          className="btn-primary"
        >
          {submitKyc.isPending ? 'Enviando...' : 'Enviar identidad a revisión'}
        </button>
        {!canSubmit && provider.kycStatus !== 'UNDER_REVIEW' && provider.kycStatus !== 'VERIFIED' && (
          <p className="text-xs text-gray-400">Subí los 3 documentos para poder enviar.</p>
        )}
      </div>
    </details>
  );
}

// ─── Sección 5: matrícula profesional ─────────────────────────────────────

function LicenseSection({ provider, done }: { provider: any; done: boolean }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['provider-onboarding'] });

  const [form, setForm] = useState({
    licenseNumber: provider?.licenseNumber ?? '',
    licenseAuthority: provider?.licenseAuthority ?? '',
    licenseExpiry: provider?.licenseExpiry ? provider.licenseExpiry.slice(0, 10) : '',
  });
  const [saved, setSaved] = useState(false);

  const saveDatos = useMutation({
    mutationFn: () => providerAccountApi.updateLicense({
      licenseNumber: form.licenseNumber,
      licenseAuthority: form.licenseAuthority,
      licenseExpiry: form.licenseExpiry || undefined,
    }),
    onSuccess: () => { invalidate(); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const upload = useMutation({
    mutationFn: (f: File) => providerAccountApi.uploadLicense(f),
    onSuccess: invalidate,
  });

  const submit = useMutation({ mutationFn: () => providerAccountApi.submitLicense(), onSuccess: invalidate });

  const canSubmit =
    provider.licenseNumber && provider.licenseAuthority && provider.licenseDocumentUrl
    && (provider.licenseStatus === 'PENDING' || provider.licenseStatus === 'REJECTED' || provider.licenseStatus === 'EXPIRED');

  return (
    <details className="card" open={!done}>
      <summary className="cursor-pointer flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          {done ? '✅' : '○'} 📜 Matrícula profesional
        </h2>
        <StatusBadge status={provider.licenseStatus} />
      </summary>

      <div className="space-y-4 mt-4">
        <p className="text-sm text-gray-600">
          Tu categoría requiere matrícula por ley argentina (ENARGAS / COPIME / SRT según
          corresponda). Cargá los datos y la foto del certificado.
        </p>

        {provider.licenseStatus === 'REJECTED' && provider.licenseRejectionReason && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            <strong>Rechazada:</strong> {provider.licenseRejectionReason}
          </div>
        )}

        <form
          onSubmit={e => { e.preventDefault(); saveDatos.mutate(); }}
          className="space-y-3"
        >
          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-2">
              ✓ Datos guardados
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Número de matrícula *</label>
              <input
                className="input"
                value={form.licenseNumber}
                onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                placeholder="M-12345"
                required
              />
            </div>
            <div>
              <label className="label">Ente emisor *</label>
              <input
                className="input"
                value={form.licenseAuthority}
                onChange={e => setForm(f => ({ ...f, licenseAuthority: e.target.value }))}
                placeholder="ENARGAS / COPIME / SRT"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Vencimiento</label>
            <input
              type="date"
              className="input max-w-xs"
              value={form.licenseExpiry}
              onChange={e => setForm(f => ({ ...f, licenseExpiry: e.target.value }))}
            />
          </div>
          <button type="submit" disabled={saveDatos.isPending} className="btn-secondary">
            {saveDatos.isPending ? 'Guardando...' : 'Guardar datos'}
          </button>
        </form>

        <FileUploadField
          label="Foto/PDF de la matrícula"
          url={provider.licenseDocumentUrl}
          onUpload={async f => { await upload.mutateAsync(f); }}
        />

        <button
          type="button"
          onClick={() => submit.mutate()}
          disabled={!canSubmit || submit.isPending}
          className="btn-primary"
        >
          {submit.isPending ? 'Enviando...' : 'Enviar matrícula a revisión'}
        </button>
      </div>
    </details>
  );
}

// ─── Galería de portfolio (fotos de trabajos realizados) ─────────────────

function PortfolioSection({ provider }: { provider: any }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const photos: string[] = provider?.portfolioPhotos ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['provider-onboarding'] });

  const add = useMutation({
    mutationFn: (f: File) => providerAccountApi.addPortfolioPhoto(f),
    onSuccess: invalidate,
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al subir foto'),
  });

  const remove = useMutation({
    mutationFn: (url: string) => providerAccountApi.removePortfolioPhoto(url),
    onSuccess: invalidate,
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try { await add.mutateAsync(f); } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <details className="card" open={photos.length === 0}>
      <summary className="cursor-pointer flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">📸 Fotos de trabajos realizados</h2>
        <span className="text-xs text-gray-500">{photos.length}/12 · Opcional pero suma mucho</span>
      </summary>

      <div className="space-y-3 mt-4">
        <p className="text-sm text-gray-600">
          Mostrá <strong>antes/después</strong>, trabajos terminados, materiales, fotos del taller.
          Los clientes eligen mucho más rápido cuando ven fotos reales.
        </p>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {photos.map((url, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={url.startsWith('http') ? url : `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')}${url}`}
                  alt={`Trabajo ${idx + 1}`}
                  className="h-28 w-full object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Eliminar esta foto del portfolio?')) remove.mutate(url);
                  }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
            Todavía no subiste ninguna foto.
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || photos.length >= 12}
          className="btn-secondary text-sm"
        >
          📷 {uploading ? 'Subiendo...' : photos.length >= 12 ? 'Llegaste al máximo (12)' : 'Agregar foto'}
        </button>
      </div>
    </details>
  );
}

// ─── Sección 6: seguro (opcional) ─────────────────────────────────────────

function InsuranceSection({ provider }: { provider: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    hasInsurance: provider?.hasInsurance ?? false,
    insuranceProvider: provider?.insuranceProvider ?? '',
    insurancePolicyNumber: provider?.insurancePolicyNumber ?? '',
    insuranceExpiry: provider?.insuranceExpiry ? provider.insuranceExpiry.slice(0, 10) : '',
  });
  const [saved, setSaved] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => providerAccountApi.updateInsurance({
      hasInsurance: form.hasInsurance,
      insuranceProvider: form.insuranceProvider || undefined,
      insurancePolicyNumber: form.insurancePolicyNumber || undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-onboarding'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const errMsg = (error as any)?.response?.data?.message;
  const errStr = Array.isArray(errMsg) ? errMsg.join(' · ') : errMsg;

  return (
    <details className="card">
      <summary className="cursor-pointer flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">🛡 Seguro de responsabilidad civil</h2>
        <span className="text-xs text-gray-500">Opcional · suma puntos para destacarte</span>
      </summary>

      <form onSubmit={e => { e.preventDefault(); mutate(); }} className="space-y-4 mt-4">
        {errStr && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {errStr}
          </div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
            ✓ Datos de seguro guardados
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.hasInsurance}
            onChange={e => setForm(f => ({ ...f, hasInsurance: e.target.checked }))}
            className="w-4 h-4 accent-brand-600"
          />
          <span className="text-sm">Tengo seguro de responsabilidad civil profesional</span>
        </label>

        {form.hasInsurance && (
          <div className="space-y-3 pl-6 border-l-2 border-brand-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Aseguradora</label>
                <input className="input" value={form.insuranceProvider} onChange={e => setForm(f => ({ ...f, insuranceProvider: e.target.value }))} placeholder="La Caja Seguros" />
              </div>
              <div>
                <label className="label">N° de póliza</label>
                <input className="input" value={form.insurancePolicyNumber} onChange={e => setForm(f => ({ ...f, insurancePolicyNumber: e.target.value }))} placeholder="POL-12345" />
              </div>
            </div>
            <div>
              <label className="label">Vencimiento</label>
              <input type="date" className="input max-w-xs" value={form.insuranceExpiry} onChange={e => setForm(f => ({ ...f, insuranceExpiry: e.target.value }))} />
            </div>
          </div>
        )}

        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Guardando...' : 'Guardar seguro'}
        </button>
      </form>
    </details>
  );
}

// ─── Sección 7: tarifas (informativas) ────────────────────────────────────

function PricingSection({ provider }: { provider: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    hourlyRate: provider?.hourlyRate ?? '',
    calloutFee: provider?.calloutFee ?? '',
    serviceRadiusKm: provider?.serviceRadiusKm ?? '',
  });
  const [saved, setSaved] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => servicesApi.upsertMyProviderProfile({
      businessName: provider.businessName,
      category: provider.category,
      cities: provider.cities,
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      calloutFee: form.calloutFee ? Number(form.calloutFee) : undefined,
      serviceRadiusKm: form.serviceRadiusKm ? Number(form.serviceRadiusKm) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-onboarding'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const errMsg = (error as any)?.response?.data?.message;
  const errStr = Array.isArray(errMsg) ? errMsg.join(' · ') : errMsg;

  return (
    <details className="card">
      <summary className="cursor-pointer flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">💰 Tarifas y cobertura</h2>
        <span className="text-xs text-gray-500">Opcional · ayuda al cliente a decidir</span>
      </summary>

      <form onSubmit={e => { e.preventDefault(); mutate(); }} className="space-y-4 mt-4">
        {errStr && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{errStr}</div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
            ✓ Tarifas guardadas
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Tarifa por hora ($)</label>
            <input type="number" min={0} className="input" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Costo de visita ($)</label>
            <input type="number" min={0} className="input" value={form.calloutFee} onChange={e => setForm(f => ({ ...f, calloutFee: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Sale a cobrar por ir aunque el cliente no acepte el presupuesto.</p>
          </div>
          <div>
            <label className="label">Radio (km)</label>
            <input type="number" min={0} max={500} className="input" value={form.serviceRadiusKm} onChange={e => setForm(f => ({ ...f, serviceRadiusKm: e.target.value }))} />
          </div>
        </div>

        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Guardando...' : 'Guardar tarifas'}
        </button>
      </form>
    </details>
  );
}
