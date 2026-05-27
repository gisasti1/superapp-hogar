'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { insuranceApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const schema = z.object({
  propertyAddress: z.string().min(5, 'Ingresá la dirección'),
  city: z.string().min(2, 'Ingresá la ciudad'),
  monthlyRent: z.coerce.number().positive('Debe ser positivo'),
  currency: z.enum(['ARS', 'USD']),
  contractMonths: z.coerce.number().int().min(1, 'Mínimo 1 mes'),
  tenantDni: z.string().min(7, 'DNI inválido').max(9, 'DNI inválido'),
});
type FormData = z.infer<typeof schema>;

export default function InsuranceQuotePage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<any[] | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'ARS', contractMonths: 24 },
  });

  const quoteMutation = useMutation({
    mutationFn: (dto: object) => insuranceApi.quote(dto),
    onSuccess: (data) => setQuotes(data.options ?? data),
  });

  const selectMutation = useMutation({
    mutationFn: ({ quoteId, providerId }: { quoteId: string; providerId: string }) =>
      insuranceApi.selectQuote(quoteId, providerId),
    onSuccess: () => router.push('/insurance'),
  });

  const onSubmit = (data: FormData) => {
    setQuotes(null);
    quoteMutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm mb-3 block">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Cotizar seguro de caución</h1>
        <p className="text-gray-500 mt-1">Completá los datos y compará planes en segundos.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Dirección del inmueble</label>
              <input
                {...register('propertyAddress')}
                type="text"
                className="input"
                placeholder="Av. Corrientes 1234, Piso 3, Depto A"
              />
              {errors.propertyAddress && (
                <p className="text-red-500 text-xs mt-1">{errors.propertyAddress.message}</p>
              )}
            </div>

            <div>
              <label className="label">Ciudad</label>
              <input
                {...register('city')}
                type="text"
                className="input"
                placeholder="Buenos Aires"
              />
              {errors.city && (
                <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label className="label">DNI del inquilino</label>
              <input
                {...register('tenantDni')}
                type="text"
                className="input"
                placeholder="12345678"
                maxLength={9}
              />
              {errors.tenantDni && (
                <p className="text-red-500 text-xs mt-1">{errors.tenantDni.message}</p>
              )}
            </div>

            <div>
              <label className="label">Alquiler mensual</label>
              <input
                {...register('monthlyRent')}
                type="number"
                className="input"
                placeholder="0"
                min="0"
              />
              {errors.monthlyRent && (
                <p className="text-red-500 text-xs mt-1">{errors.monthlyRent.message}</p>
              )}
            </div>

            <div>
              <label className="label">Moneda</label>
              <select {...register('currency')} className="input">
                <option value="ARS">ARS - Pesos argentinos</option>
                <option value="USD">USD - Dólares</option>
              </select>
            </div>

            <div>
              <label className="label">Duración del contrato (meses)</label>
              <input
                {...register('contractMonths')}
                type="number"
                className="input"
                min="1"
                max="60"
              />
              {errors.contractMonths && (
                <p className="text-red-500 text-xs mt-1">{errors.contractMonths.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={quoteMutation.isPending}
            className="btn-primary w-full"
          >
            {quoteMutation.isPending ? 'Cotizando...' : 'Cotizar ahora'}
          </button>
        </form>
      </div>

      {/* Loading */}
      {quoteMutation.isPending && (
        <div className="card py-12">
          <LoadingSpinner size="lg" />
          <p className="text-center text-gray-500 mt-4">Consultando aseguradoras...</p>
        </div>
      )}

      {/* Quote results */}
      {quotes && quotes.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500">No encontramos opciones disponibles para este perfil.</p>
        </div>
      )}

      {quotes && quotes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Compará los planes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quotes.map((q: any, i: number) => (
              <div
                key={q.providerId ?? i}
                className={`card flex flex-col gap-4 transition-shadow ${
                  i === 0 ? 'border-habitta-terra shadow-brand-100 shadow-md' : ''
                }`}
              >
                {i === 0 && (
                  <span className="inline-flex self-start bg-habitta-terra text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    Recomendado
                  </span>
                )}
                <div>
                  <p className="font-bold text-gray-900 text-lg">{q.providerName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{q.coverageMonths} meses de cobertura</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-gray-900">
                    ${Number(q.monthlyPremium).toLocaleString('es-AR')}
                    <span className="text-sm font-normal text-gray-400">/mes</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total: ${Number(q.totalPremium).toLocaleString('es-AR')} {q.currency}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-gray-500">
                    Cobertura:{' '}
                    <span className="font-semibold text-gray-900">
                      ${Number(q.coverageAmount).toLocaleString('es-AR')} {q.currency}
                    </span>
                  </p>
                </div>
                <button
                  className="btn-primary w-full mt-auto"
                  disabled={selectMutation.isPending && selectedQuoteId === q.providerId}
                  onClick={() => {
                    setSelectedQuoteId(q.providerId);
                    selectMutation.mutate({
                      quoteId: quoteMutation.data?.quoteId ?? '',
                      providerId: q.providerId,
                    });
                  }}
                >
                  {selectMutation.isPending && selectedQuoteId === q.providerId
                    ? 'Seleccionando...'
                    : 'Elegir plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
