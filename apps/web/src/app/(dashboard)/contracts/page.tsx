'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { contractsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { ContractStatus, UserRole } from '@superapp/shared';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

function contractStatusVariant(status: ContractStatus): string {
  switch (status) {
    case ContractStatus.ACTIVE: return 'success';
    case ContractStatus.SIGNED: return 'info';
    case ContractStatus.PENDING_SIGNATURES: return 'warning';
    case ContractStatus.DRAFT: return 'neutral';
    case ContractStatus.TERMINATED:
    case ContractStatus.EXPIRED: return 'error';
    default: return 'neutral';
  }
}

const STATUS_LABELS: Record<string, string> = {
  [ContractStatus.DRAFT]: 'Borrador',
  [ContractStatus.PENDING_SIGNATURES]: 'Pend. firmas',
  [ContractStatus.SIGNED]: 'Firmado',
  [ContractStatus.ACTIVE]: 'Activo',
  [ContractStatus.TERMINATED]: 'Rescindido',
  [ContractStatus.EXPIRED]: 'Vencido',
};

export default function ContractsPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const isLandlord = user?.role === UserRole.LANDLORD;

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: contractsApi.list,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-500 mt-1">Gestioná tus contratos de locación</p>
        </div>
        {isLandlord && (
          <Link href="/contracts/new" className="btn-primary text-center">
            + Nuevo contrato
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="card py-16">
          <LoadingSpinner />
        </div>
      ) : !contracts?.length ? (
        <div className="card">
          <EmptyState
            icon="📄"
            title="No tenés contratos"
            description={
              isLandlord
                ? 'Creá tu primer contrato para empezar.'
                : 'Cuando un propietario te agregue a un contrato, aparecerá aquí.'
            }
            action={
              isLandlord ? (
                <Link href="/contracts/new" className="btn-primary">
                  Crear contrato
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* ─── Cards en MOBILE (visible <md) ─────────────────────── */}
          <div className="md:hidden space-y-3">
            {contracts.map((c: any) => (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="card block hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-gray-900 text-sm">
                    {c.property?.address ?? c.propertyId}
                  </p>
                  <Badge variant={contractStatusVariant(c.status)}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {isLandlord ? 'Inquilino' : 'Propietario'}:{' '}
                  {isLandlord
                    ? (c.tenant ? `${c.tenant.firstName} ${c.tenant.lastName}` : c.tenantId)
                    : (c.landlord ? `${c.landlord.firstName} ${c.landlord.lastName}` : c.landlordId)}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-base font-bold text-gray-900">
                      ${Number(c.monthlyAmount).toLocaleString('es-AR')}
                      <span className="text-xs font-normal text-gray-500"> {c.currency}/mes</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(c.startDate).toLocaleDateString('es-AR')} —{' '}
                      {new Date(c.endDate).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <span className="text-habitta-terra font-medium text-sm">Ver →</span>
                </div>
              </Link>
            ))}
          </div>

          {/* ─── Tabla en DESKTOP (visible >=md) ───────────────────── */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Inmueble</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    {isLandlord ? 'Inquilino' : 'Propietario'}
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Monto mensual</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Vigencia</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contracts.map((c: any) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/contracts/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {c.property?.address ?? c.propertyId}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {isLandlord
                        ? (c.tenant ? `${c.tenant.firstName} ${c.tenant.lastName}` : c.tenantId)
                        : (c.landlord ? `${c.landlord.firstName} ${c.landlord.lastName}` : c.landlordId)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      ${Number(c.monthlyAmount).toLocaleString('es-AR')} {c.currency}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={contractStatusVariant(c.status)}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(c.startDate).toLocaleDateString('es-AR')} —{' '}
                      {new Date(c.endDate).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-habitta-terra font-medium text-xs">Ver →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
