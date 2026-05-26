'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, adminProvidersApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminProvidersPage() {
  const qc = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: adminApi.listProviders,
  });

  // Contador de pendientes para mostrar banner si hay para revisar.
  const { data: pending = [] } = useQuery({
    queryKey: ['admin-pending-providers', 'ALL'],
    queryFn: () => adminProvidersApi.listPending('ALL'),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      adminApi.verifyProvider(id, isVerified),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-providers'] }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.setProviderActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-providers'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProvider(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-providers'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Prestadores</h1>
        <p className="text-gray-500 text-sm mt-1">Verificar, activar/desactivar o eliminar prestadores del marketplace</p>
      </div>

      {pending.length > 0 && (
        <Link
          href="/admin/providers/review"
          className="card bg-amber-50 border-amber-200 hover:bg-amber-100 flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-amber-900 text-sm">
              🪪 {pending.length} prestador{pending.length === 1 ? '' : 'es'} esperando revisión
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Identidad o matrícula enviadas, falta tu aprobación.
            </p>
          </div>
          <span className="text-amber-900 text-sm font-medium">Ir a revisar →</span>
        </Link>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : providers.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">Sin prestadores registrados todavía</div>
      ) : (
        <div className="space-y-3">
          {providers.map((p: any) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{p.businessName}</p>
                    {p.isVerified && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">✓ Verificado</span>
                    )}
                    {!p.isActive && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inactivo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.category}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Usuario: {p.user.firstName} {p.user.lastName} ({p.user.email})
                    {p.user.phone && ` · ${p.user.phone}`}
                  </p>
                  {p.cities?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">📍 {p.cities.join(', ')}</p>
                  )}
                  {p.description && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap text-xs text-gray-400">
                    <span>⭐ {p.rating?.toFixed(1) ?? '—'}</span>
                    <span>·</span>
                    <span>{p._count.bookings} bookings</span>
                    <span>·</span>
                    <span>{p._count.reviews} reseñas</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => verifyMutation.mutate({ id: p.id, isVerified: !p.isVerified })}
                    className={`text-xs px-2 py-1 rounded ${
                      p.isVerified
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {p.isVerified ? 'Quitar verificación' : '✓ Verificar'}
                  </button>
                  <button
                    onClick={() => activeMutation.mutate({ id: p.id, isActive: !p.isActive })}
                    className={`text-xs px-2 py-1 rounded ${
                      p.isActive
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {p.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar prestador "${p.businessName}"?`)) deleteMutation.mutate(p.id);
                    }}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
