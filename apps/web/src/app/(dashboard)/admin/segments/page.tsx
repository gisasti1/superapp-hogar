'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AdminSegmentsPage() {
  const qc = useQueryClient();

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['admin-segments'],
    queryFn: marketingApi.listSegments,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => marketingApi.deleteSegment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-segments'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al eliminar'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Segmentos de usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">
            Grupos de usuarios filtrados por criterios. Después se usan para mandar
            campañas o exportar CSV.
          </p>
        </div>
        <Link href="/admin/segments/new" className="btn-primary text-sm">
          + Crear segmento
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : segments.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Todavía no creaste segmentos"
          description="Creá tu primer segmento (ej: 'Inquilinos en Buenos Aires con email opt-in') para empezar a hacer marketing dirigido."
          action={
            <Link href="/admin/segments/new" className="btn-primary text-sm">
              + Crear segmento
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {segments.map((s: any) => (
            <div key={s.id} className="card flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  {s._count?.campaigns > 0 && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {s._count.campaigns} campaña{s._count.campaigns === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="text-xs text-gray-500 mt-1">{s.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Creado por {s.createdBy?.firstName} {s.createdBy?.lastName} ·{' '}
                  {new Date(s.createdAt).toLocaleDateString('es-AR')}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <p className="text-2xl font-bold text-brand-600 tabular-nums">
                  {(s.lastCount ?? 0).toLocaleString('es-AR')}
                </p>
                <p className="text-xs text-gray-400">
                  usuarios {s.lastCountAt && `(al ${new Date(s.lastCountAt).toLocaleDateString('es-AR')})`}
                </p>
                <div className="flex gap-2 mt-2">
                  <Link href={`/admin/segments/${s.id}`} className="text-xs text-brand-600 hover:underline">
                    Editar
                  </Link>
                  <button
                    onClick={() => {
                      if (s._count?.campaigns > 0) {
                        alert(`Tiene ${s._count.campaigns} campaña(s). Borrá las campañas primero.`);
                        return;
                      }
                      if (confirm(`¿Eliminar segmento "${s.name}"?`)) deleteMutation.mutate(s.id);
                    }}
                    className="text-xs text-red-600 hover:underline"
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
