'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { insuranceApi } from '@/lib/api';
import { PolicyStatus } from '@superapp/shared';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_VARIANT: Record<string, string> = {
  [PolicyStatus.QUOTED]: 'neutral',
  [PolicyStatus.ACTIVE]: 'success',
  [PolicyStatus.CANCELLED]: 'error',
  [PolicyStatus.EXPIRED]: 'error',
  [PolicyStatus.CLAIMED]: 'warning',
};

const STATUS_LABELS: Record<string, string> = {
  [PolicyStatus.QUOTED]: 'Cotizado',
  [PolicyStatus.ACTIVE]: 'Activa',
  [PolicyStatus.CANCELLED]: 'Cancelada',
  [PolicyStatus.EXPIRED]: 'Vencida',
  [PolicyStatus.CLAIMED]: 'Con siniestro',
};

export default function InsurancePage() {
  const { data: policies, isLoading } = useQuery({
    queryKey: ['my-policies'],
    queryFn: insuranceApi.getMyPolicies,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seguro de caución</h1>
          <p className="text-gray-500 mt-1">Reemplazá la fianza en efectivo con una póliza digital</p>
        </div>
        <Link href="/insurance/quote" className="btn-primary">
          + Cotizar caución
        </Link>
      </div>

      {/* Info banner */}
      <div className="bg-habitta-sand border border-habitta-olive/30 rounded-xl p-4 flex items-start gap-3">
        <span className="text-2xl">🛡️</span>
        <div>
          <p className="font-semibold text-habitta-deep">¿Qué es el seguro de caución?</p>
          <p className="text-sm text-habitta-earth mt-1">
            Reemplaza la fianza en efectivo o garantía propietaria. El inquilino paga una prima mensual
            y la aseguradora garantiza el alquiler al propietario en caso de incumplimiento.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="card py-16">
          <LoadingSpinner />
        </div>
      ) : !policies?.length ? (
        <div className="card">
          <EmptyState
            icon="🛡️"
            title="No tenés pólizas"
            description="Cotizá una póliza de caución y olvidate de la fianza en efectivo."
            action={
              <Link href="/insurance/quote" className="btn-primary">
                Cotizar ahora
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">N° de póliza</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Aseguradora</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Prima mensual</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Vigencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {policies.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-700">{p.policyNumber}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{p.providerName}</td>
                  <td className="px-6 py-4">
                    <Badge variant={STATUS_VARIANT[p.status]}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    ${Number(p.monthlyPremium).toLocaleString('es-AR')} {p.currency}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(p.startDate).toLocaleDateString('es-AR')} —{' '}
                    {new Date(p.endDate).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
