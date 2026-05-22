'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { contractsApi, mediationApi } from '@/lib/api';
import { CaseCategory, ContractStatus } from '@superapp/shared';

const CATEGORIES: { value: CaseCategory; label: string; icon: string; desc: string }[] = [
  { value: CaseCategory.REPAIRS, label: 'Reparaciones', icon: '🔧', desc: 'Daños o arreglos pendientes' },
  { value: CaseCategory.DEPOSIT_RETURN, label: 'Devolución de depósito', icon: '💰', desc: 'Retención o demora del depósito' },
  { value: CaseCategory.RENT_INCREASE, label: 'Aumento de alquiler', icon: '📈', desc: 'Desacuerdo en ajuste de precio' },
  { value: CaseCategory.NOISE, label: 'Ruidos molestos', icon: '🔊', desc: 'Problemas de convivencia' },
  { value: CaseCategory.EXPENSES, label: 'Expensas', icon: '📋', desc: 'Liquidaciones o gastos comunes' },
  { value: CaseCategory.EARLY_TERMINATION, label: 'Rescisión anticipada', icon: '📃', desc: 'Salida antes del plazo pactado' },
  { value: CaseCategory.OTHER, label: 'Otro', icon: '❓', desc: 'Otro tipo de conflicto' },
];

const schema = z.object({
  contractId: z.string().min(1, 'Seleccioná un contrato'),
  category: z.nativeEnum(CaseCategory, { required_error: 'Seleccioná una categoría' }),
  summary: z.string().min(100, 'Describí el problema con al menos 100 caracteres'),
});
type FormData = z.infer<typeof schema>;

export default function NewMediationCasePage() {
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  const { data: contracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: contractsApi.list,
  });

  const activeContracts = contracts?.filter(
    (c: any) => c.status === ContractStatus.ACTIVE,
  ) ?? [];

  const openMutation = useMutation({
    mutationFn: (dto: object) => mediationApi.openCase(dto),
    onSuccess: (data) => router.push(`/mediation/${data.id}`),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchedCategory = watch('category');
  const watchedSummary = watch('summary') ?? '';
  const watchedContractId = watch('contractId');

  const onSubmit = (data: FormData) => {
    if (!showPreview) {
      setPendingData(data);
      setShowPreview(true);
      return;
    }
    openMutation.mutate(data);
  };

  const selectedContract = activeContracts.find((c: any) => c.id === watchedContractId);
  const selectedCategory = CATEGORIES.find(cat => cat.value === watchedCategory);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm mb-3 block">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Abrir caso de mediación</h1>
        <p className="text-gray-500 mt-1">
          Describí el problema y la IA analizará el caso con jurisprudencia argentina.
        </p>
      </div>

      {showPreview && pendingData ? (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Preview del caso</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Contrato</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {selectedContract?.property?.address ?? pendingData.contractId}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Categoría</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {selectedCategory?.icon} {selectedCategory?.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Descripción</p>
                <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{pendingData.summary}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">¿Qué pasa después?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Se notifica a la otra parte para que declaren en 72hs</li>
                <li>La IA analiza ambas versiones con jurisprudencia argentina</li>
                <li>Se genera una propuesta de resolución vinculante</li>
                <li>Podés aceptar o escalar con un mediador humano por $49 USD</li>
              </ul>
            </div>

            {openMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                Error al abrir el caso. Intentá de nuevo.
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="btn-secondary flex-1"
              >
                Editar
              </button>
              <button
                type="button"
                disabled={openMutation.isPending}
                onClick={() => openMutation.mutate(pendingData)}
                className="btn-primary flex-1"
              >
                {openMutation.isPending ? 'Abriendo...' : 'Confirmar y abrir caso'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Contract select */}
          <div className="card space-y-3">
            <h2 className="font-bold text-gray-900">1. Contrato relacionado</h2>
            {activeContracts.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                No tenés contratos activos para asociar un caso.
              </div>
            ) : (
              <select {...register('contractId')} className="input">
                <option value="">Seleccioná un contrato...</option>
                {activeContracts.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.property?.address ?? c.propertyId} — desde{' '}
                    {new Date(c.startDate).toLocaleDateString('es-AR')}
                  </option>
                ))}
              </select>
            )}
            {errors.contractId && (
              <p className="text-red-500 text-xs">{errors.contractId.message}</p>
            )}
          </div>

          {/* Category grid */}
          <div className="card space-y-3">
            <h2 className="font-bold text-gray-900">2. Categoría del conflicto</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setValue('category', cat.value, { shouldValidate: true })}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-colors',
                    watchedCategory === cat.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs font-medium text-gray-800 leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
            <input type="hidden" {...register('category')} />
            {errors.category && (
              <p className="text-red-500 text-xs">{errors.category.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="card space-y-3">
            <h2 className="font-bold text-gray-900">3. Descripción del problema</h2>
            <textarea
              {...register('summary')}
              rows={6}
              className="input resize-none"
              placeholder="Describí el problema en detalle. Incluí fechas, montos, y cualquier comunicación previa relevante..."
            />
            <div className="flex items-center justify-between">
              {errors.summary ? (
                <p className="text-red-500 text-xs">{errors.summary.message}</p>
              ) : (
                <p className="text-xs text-gray-400">Mínimo 100 caracteres</p>
              )}
              <p className={clsx('text-xs', watchedSummary.length >= 100 ? 'text-green-600' : 'text-gray-400')}>
                {watchedSummary.length} / 100
              </p>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Ver preview del caso →
          </button>
        </form>
      )}
    </div>
  );
}
