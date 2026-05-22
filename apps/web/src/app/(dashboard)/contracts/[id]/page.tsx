'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsApi, depositsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { ContractStatus } from '@superapp/shared';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_SIGNATURES: 'Pendiente de firmas',
  SIGNED: 'Firmado',
  ACTIVE: 'Activo',
  TERMINATED: 'Rescindido',
  EXPIRED: 'Vencido',
};

const STATUS_VARIANT: Record<string, string> = {
  DRAFT: 'neutral',
  PENDING_SIGNATURES: 'warning',
  SIGNED: 'info',
  ACTIVE: 'success',
  TERMINATED: 'error',
  EXPIRED: 'error',
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.get(id),
  });

  const { data: deposit } = useQuery({
    queryKey: ['deposit', id],
    queryFn: () => depositsApi.getByContract(id),
    enabled: !!contract,
  });

  const signMutation = useMutation({
    mutationFn: () => contractsApi.sign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract', id] }),
  });

  const handleDownloadPdf = async () => {
    const blob = await contractsApi.downloadPdf(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="card text-center py-16">
        <p className="text-gray-500">Contrato no encontrado.</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4">
          Volver
        </button>
      </div>
    );
  }

  const userHasSigned =
    contract.signatures?.some((s: any) => s.userId === user?.id && s.signedAt) ?? false;

  const canSign =
    !userHasSigned &&
    [ContractStatus.PENDING_SIGNATURES, ContractStatus.DRAFT].includes(contract.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Contrato</h1>
        <Badge variant={STATUS_VARIANT[contract.status]}>
          {STATUS_LABELS[contract.status] ?? contract.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: contract data */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Datos del contrato</h2>
            <dl className="grid grid-cols-2 gap-4">
              <DataItem label="Inmueble" value={contract.property?.address ?? contract.propertyId} />
              <DataItem label="Ciudad" value={contract.property?.city ?? '—'} />
              <DataItem
                label="Inquilino"
                value={
                  contract.tenant
                    ? `${contract.tenant.firstName} ${contract.tenant.lastName}`
                    : contract.tenantId
                }
              />
              <DataItem
                label="Propietario"
                value={
                  contract.landlord
                    ? `${contract.landlord.firstName} ${contract.landlord.lastName}`
                    : contract.landlordId
                }
              />
              <DataItem
                label="Monto mensual"
                value={`$${Number(contract.monthlyAmount).toLocaleString('es-AR')} ${contract.currency}`}
              />
              <DataItem
                label="Depósito"
                value={`$${Number(contract.depositAmount).toLocaleString('es-AR')} ${contract.currency}`}
              />
              <DataItem
                label="Inicio"
                value={new Date(contract.startDate).toLocaleDateString('es-AR')}
              />
              <DataItem
                label="Fin"
                value={new Date(contract.endDate).toLocaleDateString('es-AR')}
              />
            </dl>
          </div>

          {/* Signatures */}
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Firmas</h2>
            {contract.signatures?.length ? (
              <div className="space-y-3">
                {contract.signatures.map((sig: any) => (
                  <div key={sig.userId} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
                      {sig.firstName?.[0]}{sig.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {sig.firstName} {sig.lastName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {sig.role === 'TENANT' ? 'Inquilino' : 'Propietario'}
                      </p>
                    </div>
                    <div className="ml-auto">
                      {sig.signedAt ? (
                        <span className="text-green-500 font-bold text-lg" title={`Firmado ${new Date(sig.signedAt).toLocaleDateString('es-AR')}`}>
                          ✓
                        </span>
                      ) : (
                        <span className="text-gray-300 text-lg">○</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin información de firmas.</p>
            )}
          </div>
        </div>

        {/* Right: actions + cards */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="card space-y-3">
            <h2 className="font-bold text-gray-900">Acciones</h2>
            {canSign && (
              <button
                className="btn-primary w-full"
                disabled={signMutation.isPending}
                onClick={() => signMutation.mutate()}
              >
                {signMutation.isPending ? 'Firmando...' : '✍️ Firmar contrato'}
              </button>
            )}
            {userHasSigned && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span>✓</span> Ya firmaste este contrato
              </p>
            )}
            <button onClick={handleDownloadPdf} className="btn-secondary w-full">
              📄 Descargar PDF
            </button>
          </div>

          {/* Policy card */}
          {contract.policy && (
            <div className="card space-y-2">
              <h2 className="font-bold text-gray-900 text-sm">Póliza de caución</h2>
              <p className="text-xs text-gray-500">N° {contract.policy.policyNumber}</p>
              <p className="text-xs text-gray-500">{contract.policy.providerName}</p>
              <Badge variant={contract.policy.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {contract.policy.status}
              </Badge>
            </div>
          )}

          {/* Deposit card */}
          {deposit && (
            <div className="card space-y-2">
              <h2 className="font-bold text-gray-900 text-sm">Depósito en garantía</h2>
              <p className="text-sm font-bold text-gray-900">
                ${Number(deposit.amount).toLocaleString('es-AR')} {deposit.currency}
              </p>
              <Badge variant={deposit.status === 'HELD' ? 'info' : 'success'}>
                {deposit.status === 'HELD' ? 'En custodia' : 'Liberado'}
              </Badge>
              {deposit.interestEarned > 0 && (
                <p className="text-xs text-green-600">
                  +${Number(deposit.interestEarned).toLocaleString('es-AR')} en intereses
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}
