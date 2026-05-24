'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rentalRequestsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Aprobada', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600' },
  EXPIRED: { label: 'Vencida', color: 'bg-gray-100 text-gray-600' },
  CONVERTED: { label: 'Contrato firmado', color: 'bg-blue-100 text-blue-700' },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const imgUrl = (u: string) => !u ? '' : u.startsWith('http') ? u : `${API_BASE}${u}`;

export default function RentalRequestsPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['rental-requests'],
    queryFn: rentalRequestsApi.list,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response?: string }) =>
      rentalRequestsApi.approve(id, response),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rental-requests'] }),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response?: string }) =>
      rentalRequestsApi.reject(id, response),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rental-requests'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => rentalRequestsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rental-requests'] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const isLandlord = user?.role === 'LANDLORD';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isLandlord ? 'Solicitudes recibidas' : 'Mis solicitudes de alquiler'}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {isLandlord
            ? 'Inquilinos que postularon a tus inmuebles publicados.'
            : 'Inmuebles a los que te postulaste.'}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📨"
            title={isLandlord ? 'Sin solicitudes' : 'No te postulaste a ningún inmueble'}
            description={
              isLandlord
                ? 'Cuando un inquilino postule, va a aparecer acá.'
                : 'Cuando veas un inmueble que te guste, tocá "Solicitar alquiler".'
            }
            action={
              !isLandlord ? (
                <Link href="/listings" className="btn-primary">Buscar inmuebles</Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => {
            const status = STATUS_LABELS[r.status] ?? STATUS_LABELS.PENDING;
            const counterparty = isLandlord ? r.tenant : r.landlord;
            const firstImage = r.property.images?.[0]?.url;
            return (
              <div key={r.id} className="card flex flex-col sm:flex-row gap-4">
                {firstImage ? (
                  <img
                    src={imgUrl(firstImage)}
                    alt={r.property.address}
                    className="w-full sm:w-32 h-32 sm:h-24 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-full sm:w-32 h-32 sm:h-24 bg-gradient-to-br from-brand-100 to-brand-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">🏠</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{r.property.address}</p>
                      <p className="text-xs text-gray-500">
                        {r.property.city} · ${Number(r.property.monthlyRent).toLocaleString('es-AR')} {r.property.currency}/mes
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="text-xs text-gray-400">{isLandlord ? 'Solicitante:' : 'Propietario:'}</span>{' '}
                    {counterparty.firstName} {counterparty.lastName}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString('es-AR')}</p>

                  {/* Acciones */}
                  {r.status === 'PENDING' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {isLandlord ? (
                        <>
                          <button
                            onClick={() => {
                              const resp = prompt('Mensaje al inquilino (opcional):', 'Aprobado, te paso datos por privado.');
                              approveMutation.mutate({ id: r.id, response: resp ?? undefined });
                            }}
                            disabled={approveMutation.isPending}
                            className="btn-primary text-sm"
                          >
                            ✓ Aprobar
                          </button>
                          <button
                            onClick={() => {
                              const resp = prompt('Motivo del rechazo (opcional):');
                              if (resp !== null) rejectMutation.mutate({ id: r.id, response: resp || undefined });
                            }}
                            disabled={rejectMutation.isPending}
                            className="btn-secondary text-sm"
                          >
                            ✕ Rechazar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm('¿Cancelar tu solicitud?')) cancelMutation.mutate(r.id);
                          }}
                          disabled={cancelMutation.isPending}
                          className="btn-secondary text-sm"
                        >
                          Cancelar mi solicitud
                        </button>
                      )}
                    </div>
                  )}

                  {/* Mensaje del usuario */}
                  {r.message && (
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700 text-xs">
                        Ver mensaje
                      </summary>
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap bg-gray-50 p-2 rounded">{r.message}</p>
                    </details>
                  )}

                  {/* Respuesta del propietario */}
                  {r.response && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                      <p className="text-blue-900 font-medium">Respuesta del propietario:</p>
                      <p className="text-blue-800 mt-0.5">{r.response}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
