'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { contractsApi, listingsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

// ── Step schemas ──────────────────────────────────────────────────────────
const step1Schema = z.object({
  propertyId: z.string().min(1, 'Seleccioná una propiedad'),
});

const step2Schema = z.object({
  tenantEmail: z.string().email('Email inválido'),
});

const step3Schema = z.object({
  startDate: z.string().min(1, 'Requerido'),
  endDate: z.string().min(1, 'Requerido'),
  monthlyAmount: z.coerce.number().positive('Debe ser positivo'),
  currency: z.enum(['ARS', 'USD']),
  depositAmount: z.coerce.number().min(0),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;

const STEPS = ['Inmueble', 'Partes', 'Condiciones'];

export default function NewContractPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1 | null>(null);
  const [step2Data, setStep2Data] = useState<Step2 | null>(null);

  const { data: properties, isLoading: loadingProps } = useQuery({
    queryKey: ['my-properties'],
    queryFn: listingsApi.getMyProperties,
  });

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) });
  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { currency: 'ARS', depositAmount: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (dto: object) => contractsApi.create(dto),
    onSuccess: (contract) => {
      router.push(`/contracts/${contract.id}`);
    },
  });

  const onStep1 = (data: Step1) => {
    setStep1Data(data);
    setStep(1);
  };

  const onStep2 = (data: Step2) => {
    setStep2Data(data);
    setStep(2);
  };

  const onStep3 = (data: Step3) => {
    createMutation.mutate({
      ...step1Data,
      ...step2Data,
      ...data,
      landlordId: user?.id,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm mb-3 block">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo contrato</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  i < step
                    ? 'bg-brand-600 text-white'
                    : i === step
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                    : 'bg-gray-100 text-gray-400',
                )}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className={clsx('text-xs mt-1 font-medium', i <= step ? 'text-brand-600' : 'text-gray-400')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx('flex-1 h-0.5 mx-2 mb-4', i < step ? 'bg-brand-600' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Inmueble */}
      {step === 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Seleccioná el inmueble</h2>
          <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
            {loadingProps ? (
              <p className="text-sm text-gray-400">Cargando propiedades...</p>
            ) : !properties?.length ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                No tenés propiedades publicadas.{' '}
                <a href="/listings" className="underline font-medium">Publicar inmueble</a>
              </div>
            ) : (
              <div className="space-y-2">
                {properties.map((p: any) => (
                  <label
                    key={p.id}
                    className={clsx(
                      'flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors',
                      form1.watch('propertyId') === p.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <input
                      type="radio"
                      value={p.id}
                      {...form1.register('propertyId')}
                      className="accent-brand-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{p.address}</p>
                      <p className="text-sm text-gray-500">{p.city}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {form1.formState.errors.propertyId && (
              <p className="text-red-500 text-xs">{form1.formState.errors.propertyId.message}</p>
            )}
            <button type="submit" className="btn-primary w-full">Continuar</button>
          </form>
        </div>
      )}

      {/* Step 2: Partes */}
      {step === 1 && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Datos de las partes</h2>
          <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Propietario (vos)</p>
              <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>

            <div>
              <label className="label">Email del inquilino</label>
              <input
                {...form2.register('tenantEmail')}
                type="email"
                className="input"
                placeholder="inquilino@email.com"
              />
              {form2.formState.errors.tenantEmail && (
                <p className="text-red-500 text-xs mt-1">{form2.formState.errors.tenantEmail.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Se le enviará una invitación para firmar el contrato.
              </p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1">
                Atrás
              </button>
              <button type="submit" className="btn-primary flex-1">Continuar</button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Condiciones */}
      {step === 2 && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Condiciones del contrato</h2>
          <form onSubmit={form3.handleSubmit(onStep3)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha de inicio</label>
                <input {...form3.register('startDate')} type="date" className="input" />
                {form3.formState.errors.startDate && (
                  <p className="text-red-500 text-xs mt-1">{form3.formState.errors.startDate.message}</p>
                )}
              </div>
              <div>
                <label className="label">Fecha de fin</label>
                <input {...form3.register('endDate')} type="date" className="input" />
                {form3.formState.errors.endDate && (
                  <p className="text-red-500 text-xs mt-1">{form3.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label">Alquiler mensual</label>
                <input
                  {...form3.register('monthlyAmount')}
                  type="number"
                  className="input"
                  placeholder="0"
                  min="0"
                />
                {form3.formState.errors.monthlyAmount && (
                  <p className="text-red-500 text-xs mt-1">{form3.formState.errors.monthlyAmount.message}</p>
                )}
              </div>
              <div>
                <label className="label">Moneda</label>
                <select {...form3.register('currency')} className="input">
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">
                Depósito en garantía{' '}
                <span className="text-gray-400 font-normal">(meses equivalentes)</span>
              </label>
              <input
                {...form3.register('depositAmount')}
                type="number"
                className="input"
                placeholder="0"
                min="0"
              />
            </div>

            {createMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                Error al crear el contrato. Intentá de nuevo.
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                Atrás
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary flex-1"
              >
                {createMutation.isPending ? 'Creando...' : 'Crear contrato'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
