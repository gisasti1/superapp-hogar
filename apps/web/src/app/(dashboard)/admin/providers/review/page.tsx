'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminProvidersApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type Filter = 'ALL' | 'KYC' | 'LICENSE';

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
  return <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${s.color}`}>{s.label}</span>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Las URLs de docs vienen como /uploads/providers/xxx. Hay que prependear el API base. */
function docUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

export default function AdminProviderReviewPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['admin-pending-providers', filter],
    queryFn: () => adminProvidersApi.listPending(filter),
  });

  const reviewKyc = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'APPROVE' | 'REJECT'; reason?: string }) =>
      adminProvidersApi.reviewKyc(id, action, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pending-providers'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error'),
  });

  const reviewLicense = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'APPROVE' | 'REJECT'; reason?: string }) =>
      adminProvidersApi.reviewLicense(id, action, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pending-providers'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error'),
  });

  const verifyPayout = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      adminProvidersApi.verifyPayout(id, verified),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pending-providers'] }),
  });

  const handleReject = (
    mutation: typeof reviewKyc,
    id: string,
    label: string,
  ) => {
    const reason = prompt(`Motivo del rechazo (${label}). Será visible al prestador:`);
    if (!reason?.trim()) return;
    mutation.mutate({ id, action: 'REJECT', reason });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Revisión de prestadores</h1>
        <p className="text-gray-500 text-sm mt-1">
          Aprobar o rechazar verificación de identidad y matrículas. Una vez aprobado todo, el prestador queda como
          <strong> verificado</strong> en el marketplace.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'KYC', 'LICENSE'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              filter === f
                ? 'bg-habitta-terra text-white border-habitta-terra'
                : 'bg-white text-gray-700 border-gray-200 hover:border-habitta-terra'
            }`}
          >
            {f === 'ALL' ? 'Todos' : f === 'KYC' ? 'Sólo identidad' : 'Sólo matrícula'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : pending.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          ✨ No hay prestadores con revisiones pendientes.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((p: any) => (
            <div key={p.id} className="card space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{p.businessName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.category}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {p.user.firstName} {p.user.lastName} · {p.user.email}
                    {p.user.phone && ` · ${p.user.phone}`}
                  </p>
                  {p.cities?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">📍 {p.cities.join(', ')}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500" title="Verificación de identidad (KYC)">Identidad:</span>
                    <StatusBadge status={p.kycStatus} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Matrícula:</span>
                    <StatusBadge status={p.licenseStatus} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Pago:</span>
                    <span className={p.payoutVerified ? 'text-green-700' : 'text-gray-400'}>
                      {p.payoutVerified ? '✓ Verificado' : (p.payoutMethod ? 'Cargado' : 'Sin cargar')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Documentos personales */}
              <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2">
                <p><strong>Doc:</strong> {p.documentType ?? '—'} {p.documentNumber ?? ''}</p>
                {p.birthDate && <p><strong>Nac:</strong> {new Date(p.birthDate).toLocaleDateString('es-AR')}</p>}
              </div>

              {/* Revisión identidad (KYC) */}
              {p.kycStatus === 'UNDER_REVIEW' && (
                <div className="border-t pt-3 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">📷 Revisar identidad</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { label: 'DNI Frente', url: docUrl(p.idDocumentFrontUrl) },
                      { label: 'DNI Dorso', url: docUrl(p.idDocumentBackUrl) },
                      { label: 'Selfie', url: docUrl(p.selfieUrl) },
                    ].map(d => (
                      <div key={d.label} className="border rounded p-2 bg-white">
                        <p className="text-xs font-medium text-gray-600 mb-2">{d.label}</p>
                        {d.url ? (
                          <a href={d.url} target="_blank" rel="noopener">
                            {d.url.endsWith('.pdf') ? (
                              <div className="bg-gray-100 h-32 flex items-center justify-center text-xs text-gray-500">
                                📄 Ver PDF
                              </div>
                            ) : (
                              <img src={d.url} alt={d.label} className="w-full h-32 object-cover rounded" />
                            )}
                          </a>
                        ) : (
                          <div className="bg-red-50 h-32 flex items-center justify-center text-xs text-red-600">
                            Falta
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewKyc.mutate({ id: p.id, action: 'APPROVE' })}
                      disabled={reviewKyc.isPending}
                      className="text-sm bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700"
                    >
                      ✓ Aprobar identidad
                    </button>
                    <button
                      onClick={() => handleReject(reviewKyc, p.id, 'KYC')}
                      disabled={reviewKyc.isPending}
                      className="text-sm bg-red-100 text-red-700 px-4 py-1.5 rounded hover:bg-red-200"
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              )}

              {/* Revisión matrícula */}
              {p.licenseStatus === 'UNDER_REVIEW' && (
                <div className="border-t pt-3 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">📜 Revisar matrícula</p>
                  <div className="text-xs text-gray-700 bg-gray-50 border rounded p-2">
                    <p><strong>Número:</strong> {p.licenseNumber}</p>
                    <p><strong>Ente:</strong> {p.licenseAuthority}</p>
                    {p.licenseExpiry && (
                      <p><strong>Vence:</strong> {new Date(p.licenseExpiry).toLocaleDateString('es-AR')}</p>
                    )}
                  </div>
                  {docUrl(p.licenseDocumentUrl) && (
                    <a href={docUrl(p.licenseDocumentUrl)!} target="_blank" rel="noopener" className="block">
                      {p.licenseDocumentUrl.endsWith('.pdf') ? (
                        <div className="bg-gray-100 h-32 flex items-center justify-center text-xs text-gray-500 rounded">
                          📄 Ver matrícula (PDF)
                        </div>
                      ) : (
                        <img src={docUrl(p.licenseDocumentUrl)!} alt="Matrícula" className="max-w-md h-48 object-cover rounded border" />
                      )}
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewLicense.mutate({ id: p.id, action: 'APPROVE' })}
                      disabled={reviewLicense.isPending}
                      className="text-sm bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700"
                    >
                      ✓ Aprobar matrícula
                    </button>
                    <button
                      onClick={() => handleReject(reviewLicense, p.id, 'Matrícula')}
                      disabled={reviewLicense.isPending}
                      className="text-sm bg-red-100 text-red-700 px-4 py-1.5 rounded hover:bg-red-200"
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              )}

              {/* Cuenta de cobro (acción rápida sin esperar a UNDER_REVIEW) */}
              {p.payoutMethod && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">💳 Cuenta de cobro</p>
                  <div className="text-xs text-gray-700 bg-gray-50 border rounded p-2 space-y-0.5">
                    <p><strong>Método:</strong> {p.payoutMethod}</p>
                    {p.cbu && <p><strong>CBU:</strong> <span className="font-mono">{p.cbu}</span></p>}
                    {p.cvu && <p><strong>CVU:</strong> <span className="font-mono">{p.cvu}</span></p>}
                    {p.mpAccountId && <p><strong>MP:</strong> {p.mpAccountId}</p>}
                    {p.bankAccountHolder && <p><strong>Titular:</strong> {p.bankAccountHolder} ({p.bankAccountHolderId})</p>}
                    {p.bankAlias && <p><strong>Alias:</strong> {p.bankAlias}</p>}
                    {p.bankName && <p><strong>Banco:</strong> {p.bankName}</p>}
                  </div>
                  <button
                    onClick={() => verifyPayout.mutate({ id: p.id, verified: !p.payoutVerified })}
                    className={`text-xs px-3 py-1 rounded ${
                      p.payoutVerified
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {p.payoutVerified ? 'Quitar verificación de cuenta' : 'Verificar cuenta'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
