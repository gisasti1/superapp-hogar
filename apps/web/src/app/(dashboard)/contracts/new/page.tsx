'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense as _Suspense } from 'react';

// Cast por el doble @types/react que rompe el JSX type checking de Suspense.
const Suspense = _Suspense as any;
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { contractsApi, listingsApi, contractTemplatesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ─── Schemas ──────────────────────────────────────────────────────────── */
const step2Schema = z.object({ propertyId: z.string().min(1, 'Seleccioná una propiedad') });
const step3Schema = z.object({ tenantEmail: z.string().email('Email inválido') });
const step4Schema = z.object({
  startDate:     z.string().min(1, 'Requerido'),
  endDate:       z.string().min(1, 'Requerido'),
  monthlyAmount: z.coerce.number().positive('Debe ser positivo'),
  currency:      z.enum(['ARS', 'USD']),
  depositAmount: z.coerce.number().min(0),
});
type S2 = z.infer<typeof step2Schema>;
type S3 = z.infer<typeof step3Schema>;
type S4 = z.infer<typeof step4Schema>;

const STEPS = ['Plantilla', 'Inmueble', 'Partes', 'Condiciones'];

const TYPE_CFG: Record<string, { label: string; icon: string; color: string }> = {
  RESIDENTIAL: { label: 'Residencial', icon: '🏠', color: 'text-blue-700' },
  COMMERCIAL:  { label: 'Comercial',   icon: '🏢', color: 'text-violet-700' },
  SEASONAL:    { label: 'Temporario',  icon: '🏖️', color: 'text-amber-700' },
};

/* ─── Stepper ──────────────────────────────────────────────────────────── */
function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={clsx(
              'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
              i < step  ? 'bg-indigo-600 text-white'
              : i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
              : 'bg-gray-100 text-gray-400',
            )}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={clsx('text-[10px] mt-1 font-semibold', i <= step ? 'text-indigo-600' : 'text-gray-400')}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={clsx('flex-1 h-0.5 mx-2 mb-4', i < step ? 'bg-indigo-500' : 'bg-gray-200')} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function NewContractPage() {
  return (
    <Suspense fallback={null}>
      <NewContractPageInner />
    </Suspense>
  );
}

function NewContractPageInner() {
  const router     = useRouter();
  const params     = useSearchParams();
  const user       = useAuthStore(s => s.user);

  const [step,    setStep]    = useState(0);
  const [tplId,   setTplId]   = useState<string | null>(params.get('templateId'));
  const [s2data,  setS2data]  = useState<S2 | null>(null);
  const [s3data,  setS3data]  = useState<S3 | null>(null);

  /* Queries */
  const { data: templates = [], isLoading: tplLoading } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: () => contractTemplatesApi.list(),
    enabled: step === 0,
  });

  const { data: properties, isLoading: propsLoading } = useQuery({
    queryKey: ['my-properties'],
    queryFn: listingsApi.getMyProperties,
    enabled: step === 1,
  });

  // If templateId pre-selected, skip to step 1
  useEffect(() => {
    if (params.get('templateId')) setStep(1);
  }, []);

  /* Forms */
  const form2 = useForm<S2>({ resolver: zodResolver(step2Schema) });
  const form3 = useForm<S3>({ resolver: zodResolver(step3Schema) });
  const form4 = useForm<S4>({ resolver: zodResolver(step4Schema), defaultValues: { currency: 'ARS', depositAmount: 0 } });

  const createMutation = useMutation({
    mutationFn: (dto: object) => contractsApi.create(dto),
    onSuccess: async (contract: any) => {
      // If a template was chosen, fill it and save the content
      if (tplId) {
        try {
          const prop    = (properties as any[])?.find((p: any) => p.id === s2data?.propertyId);
          const filled  = await contractTemplatesApi.fill({
            templateId:      tplId,
            landlordName:    `${user?.firstName} ${user?.lastName}`,
            landlordDni:     '—',
            landlordAddress: '—',
            tenantName:      '—',
            tenantDni:       '—',
            tenantAddress:   '—',
            address:         prop?.address ?? '—',
            city:            prop?.city ?? '—',
            province:        prop?.province ?? '—',
            rooms:           prop?.rooms,
            startDate:       form4.getValues('startDate'),
            endDate:         form4.getValues('endDate'),
            monthlyRent:     form4.getValues('monthlyAmount'),
            currency:        form4.getValues('currency'),
            deposit:         form4.getValues('depositAmount'),
          });
          await contractTemplatesApi.saveToContract(contract.id, filled.content, tplId);
        } catch (_) { /* non-fatal */ }
      }
      router.push(`/contracts/${contract.id}`);
    },
  });

  const onS2 = (d: S2) => { setS2data(d); setStep(2); };
  const onS3 = (d: S3) => { setS3data(d); setStep(3); };
  const onS4 = (d: S4) => {
    createMutation.mutate({ ...s2data, ...s3data, ...d, landlordId: user?.id });
  };

  const selectedTpl = tplId ? (templates as any[]).find(t => t.id === tplId) : null;

  /* ── Step 0: elegir plantilla ─────────────────────────────────────── */
  const renderStep0 = () => (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="font-bold text-gray-900">¿Con qué plantilla querés empezar?</h2>
          <p className="text-sm text-gray-500 mt-0.5">Podés usar una plantilla base o continuar sin texto predefinido.</p>
        </div>

        {tplLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : (
          <div className="space-y-2">
            {/* Sin plantilla */}
            <label className={clsx(
              'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
              tplId === null ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300',
            )}>
              <input type="radio" name="tpl" checked={tplId === null} onChange={() => setTplId(null)} className="accent-gray-600 w-4 h-4" />
              <div>
                <p className="font-semibold text-gray-900 text-sm">Sin plantilla</p>
                <p className="text-xs text-gray-500">Creás el contrato solo con los datos básicos. Podés agregar texto después.</p>
              </div>
            </label>

            {/* Templates */}
            {(templates as any[]).map((t: any) => {
              const cfg = TYPE_CFG[t.type] ?? TYPE_CFG.RESIDENTIAL;
              return (
                <label key={t.id} className={clsx(
                  'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                  tplId === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300',
                )}>
                  <input type="radio" name="tpl" checked={tplId === t.id} onChange={() => setTplId(t.id)} className="accent-indigo-600 w-4 h-4 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
                      <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                      {t.isBuiltIn && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Ley 27.551</span>}
                    </div>
                    {t.description && <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <Link href="/contracts/templates" className="text-sm text-indigo-600 hover:underline">
          Ver y crear plantillas →
        </Link>
        <button onClick={() => setStep(1)} className="btn-primary">Continuar →</button>
      </div>
    </div>
  );

  /* ── Step 1: Inmueble ─────────────────────────────────────────────── */
  const renderStep1 = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      {selectedTpl && (
        <div className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl">
          📄 Plantilla: <strong>{selectedTpl.title}</strong>
        </div>
      )}
      <h2 className="font-bold text-gray-900">Seleccioná el inmueble</h2>
      <form onSubmit={form2.handleSubmit(onS2)} className="space-y-3">
        {propsLoading ? <div className="flex justify-center py-6"><LoadingSpinner /></div>
          : !(properties as any[])?.length ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              No tenés propiedades publicadas. <Link href="/listings" className="underline font-semibold">Publicar inmueble →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {(properties as any[]).map((p: any) => (
                <label key={p.id} className={clsx(
                  'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                  form2.watch('propertyId') === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300',
                )}>
                  <input type="radio" value={p.id} {...form2.register('propertyId')} className="accent-indigo-600 w-4 h-4" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{p.address}</p>
                    <p className="text-xs text-gray-500">{p.city} · {p.rooms} amb.</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        {form2.formState.errors.propertyId && <p className="text-red-500 text-xs">{form2.formState.errors.propertyId.message}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1">← Atrás</button>
          <button type="submit" className="btn-primary flex-1">Continuar →</button>
        </div>
      </form>
    </div>
  );

  /* ── Step 2: Partes ───────────────────────────────────────────────── */
  const renderStep2 = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-gray-900">Partes del contrato</h2>
      <form onSubmit={form3.handleSubmit(onS3)} className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Locador/a (vos)</p>
          <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
        <div>
          <label className="label">Email del/de la locatario/a (inquilino/a)</label>
          <input {...form3.register('tenantEmail')} type="email" className="input" placeholder="inquilino@email.com" />
          {form3.formState.errors.tenantEmail && <p className="text-red-500 text-xs mt-1">{form3.formState.errors.tenantEmail.message}</p>}
          <p className="text-xs text-gray-400 mt-1">Se enviará una invitación digital para firmar el contrato.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Atrás</button>
          <button type="submit" className="btn-primary flex-1">Continuar →</button>
        </div>
      </form>
    </div>
  );

  /* ── Step 3: Condiciones ──────────────────────────────────────────── */
  const renderStep3 = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-gray-900">Condiciones económicas</h2>
      <form onSubmit={form4.handleSubmit(onS4)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha de inicio</label>
            <input {...form4.register('startDate')} type="date" className="input" />
            {form4.formState.errors.startDate && <p className="text-red-500 text-xs mt-1">{form4.formState.errors.startDate.message}</p>}
          </div>
          <div>
            <label className="label">Fecha de fin</label>
            <input {...form4.register('endDate')} type="date" className="input" />
            {form4.formState.errors.endDate && <p className="text-red-500 text-xs mt-1">{form4.formState.errors.endDate.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Alquiler mensual</label>
            <input {...form4.register('monthlyAmount')} type="number" className="input" placeholder="480000" min="0" />
            {form4.formState.errors.monthlyAmount && <p className="text-red-500 text-xs mt-1">{form4.formState.errors.monthlyAmount.message}</p>}
          </div>
          <div>
            <label className="label">Moneda</label>
            <select {...form4.register('currency')} className="input">
              <option value="ARS">$ ARS</option>
              <option value="USD">U$D USD</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Depósito en garantía <span className="text-gray-400 font-normal">(importe)</span></label>
          <input {...form4.register('depositAmount')} type="number" className="input" placeholder="480000" min="0" />
          <p className="text-xs text-gray-400 mt-1">Ley 27.551 — máximo 1 mes de alquiler.</p>
        </div>

        {tplId && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
            ✅ Se usará la plantilla <strong>{selectedTpl?.title ?? tplId}</strong> como texto base del contrato. Podrás editarla después.
          </div>
        )}

        {createMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
            Error al crear el contrato. Revisá los datos e intentá de nuevo.
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">← Atrás</button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
            {createMutation.isPending ? <><LoadingSpinner /> Creando…</> : '📄 Crear contrato'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Contratos</p>
          <h1 className="text-xl font-extrabold text-gray-900">Nuevo contrato</h1>
        </div>
      </div>

      <Stepper step={step} />

      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}
