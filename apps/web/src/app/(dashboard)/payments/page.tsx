'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { paymentsApi } from '@/lib/api';
import { PaymentStatus, PaymentType } from '@superapp/shared';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

type Tab = 'pending' | 'history';

const STATUS_VARIANT: Record<string, string> = {
  [PaymentStatus.PENDING]: 'warning',
  [PaymentStatus.PROCESSING]: 'info',
  [PaymentStatus.PAID]: 'success',
  [PaymentStatus.FAILED]: 'error',
  [PaymentStatus.REFUNDED]: 'neutral',
  [PaymentStatus.OVERDUE]: 'error',
};

const STATUS_LABELS: Record<string, string> = {
  [PaymentStatus.PENDING]: 'Pendiente',
  [PaymentStatus.PROCESSING]: 'Procesando',
  [PaymentStatus.PAID]: 'Pagado',
  [PaymentStatus.FAILED]: 'Fallido',
  [PaymentStatus.REFUNDED]: 'Reembolsado',
  [PaymentStatus.OVERDUE]: 'Vencido',
};

const TYPE_LABELS: Record<string, string> = {
  [PaymentType.RENT]: 'Alquiler',
  [PaymentType.INSURANCE_PREMIUM]: 'Prima de seguro',
  [PaymentType.DEPOSIT]: 'Depósito',
  [PaymentType.SERVICE]: 'Servicio',
  [PaymentType.MEDIATION_FEE]: 'Mediación',
  [PaymentType.SUBSCRIPTION]: 'Suscripción',
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>('pending');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsApi.list,
  });

  const initPaymentMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.initPayment(id),
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
      }
    },
  });

  const pending = payments?.filter((p: any) =>
    [PaymentStatus.PENDING, PaymentStatus.OVERDUE].includes(p.status),
  ) ?? [];

  const history = payments?.filter((p: any) =>
    ![PaymentStatus.PENDING, PaymentStatus.OVERDUE].includes(p.status),
  ) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="text-gray-500 mt-1">Gestioná tus pagos y cobros</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['pending', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t === 'pending' ? `Pendientes${pending.length ? ` (${pending.length})` : ''}` : 'Historial'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card py-16">
          <LoadingSpinner />
        </div>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="✅"
              title="No tenés pagos pendientes"
              description="Estás al día con todos tus pagos."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map((p: any) => (
              <div key={p.id} className="card flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </p>
                    {p.contractId && (
                      <p className="text-xs text-gray-400 mt-0.5">Contrato #{p.contractId.slice(-8)}</p>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANT[p.status]}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      ${Number(p.amount).toLocaleString('es-AR')}
                      <span className="text-sm font-normal text-gray-400 ml-1">{p.currency}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Vence: {new Date(p.dueDate).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    disabled={initPaymentMutation.isPending}
                    onClick={() => initPaymentMutation.mutate(p.id)}
                  >
                    Pagar →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="💳"
              title="Sin historial de pagos"
              description="Los pagos completados aparecerán aquí."
            />
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Monto</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(p.paidAt ?? p.dueDate).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ${Number(p.amount).toLocaleString('es-AR')} {p.currency}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_VARIANT[p.status]}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
