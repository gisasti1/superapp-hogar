'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const STATUS_BADGES: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

export default function AdminIssuesPage() {
  const qc = useQueryClient();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['admin-issues'],
    queryFn: adminApi.listIssues,
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminApi.forceCloseIssue(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-issues'] }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Desperfectos reportados</h1>
        <p className="text-gray-500 text-sm mt-1">Cerrar issues que no fueron resueltos correctamente</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : issues.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">Sin desperfectos reportados</div>
      ) : (
        <div className="space-y-3">
          {issues.map((i: any) => (
            <div key={i.id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-gray-900">{i.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGES[i.status]}`}>
                      {i.status}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      i.priority === 'URGENT' ? 'bg-red-100 text-red-700'
                        : i.priority === 'HIGH' ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {i.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {i.property.address}, {i.property.city}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Reportado por {i.reportedBy.firstName} {i.reportedBy.lastName} ({i.reportedBy.email}) · {new Date(i.createdAt).toLocaleDateString('es-AR')}
                  </p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{i.description}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link href={`/issues/${i.id}`} className="text-xs text-habitta-terra hover:underline text-right">
                    Ver detalle →
                  </Link>
                  {i.status !== 'CLOSED' && (
                    <button
                      onClick={() => {
                        const note = prompt('Nota de cierre (opcional):', 'Cerrado por administrador');
                        if (note !== null) closeMutation.mutate({ id: i.id, note: note || undefined });
                      }}
                      className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Forzar cierre
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
