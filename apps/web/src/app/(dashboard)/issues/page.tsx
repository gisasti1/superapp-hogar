'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { issuesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Abierto', color: 'bg-blue-100 text-blue-700' },
  ACKNOWLEDGED: { label: 'Recibido', color: 'bg-amber-100 text-amber-800' },
  IN_PROGRESS: { label: 'En curso', color: 'bg-amber-100 text-amber-800' },
  RESOLVED: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Cerrado', color: 'bg-gray-100 text-gray-600' },
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-gray-700',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600 font-bold',
};

const CATEGORY_ICONS: Record<string, string> = {
  PLUMBING: '🚰',
  ELECTRICAL: '⚡',
  APPLIANCES: '🔌',
  STRUCTURAL: '🧱',
  PEST: '🪳',
  HEATING_COOLING: '❄️',
  COMMON_AREAS: '🏛️',
  OTHER: '🛠',
};

export default function IssuesPage() {
  const user = useAuthStore(s => s.user);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['issues'],
    queryFn: issuesApi.list,
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Desperfectos</h1>
        <p className="text-gray-500 mt-1">
          {user?.role === 'LANDLORD'
            ? 'Reportes de tus inquilinos sobre tus inmuebles.'
            : 'Reportá problemas del inmueble que alquilás y seguilos hasta su resolución.'}
        </p>
      </div>

      {issues.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🛠"
            title="Sin desperfectos reportados"
            description={
              user?.role === 'LANDLORD'
                ? 'Cuando tus inquilinos reporten algo, va a aparecer acá.'
                : 'Si algo no funciona en el inmueble que alquilás, reportalo desde el detalle de la propiedad.'
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((i: any) => {
            const status = STATUS_LABELS[i.status] ?? STATUS_LABELS.OPEN;
            return (
              <Link
                key={i.id}
                href={`/issues/${i.id}`}
                className="card block hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{CATEGORY_ICONS[i.category] ?? '🛠'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-gray-900 line-clamp-1">{i.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{i.property.address} · {i.property.city}</p>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{i.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                      <span>Reportado por {i.reportedBy.firstName} {i.reportedBy.lastName}</span>
                      <span>·</span>
                      <span>{new Date(i.createdAt).toLocaleDateString('es-AR')}</span>
                      <span>·</span>
                      <span className={PRIORITY_BADGE[i.priority]}>{i.priority}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
