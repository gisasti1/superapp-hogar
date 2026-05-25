'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.stats,
    refetchInterval: 30_000,
  });

  if (isLoading || !stats) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas del sistema</h1>
        <p className="text-gray-500 text-sm mt-1">Métricas en tiempo real (refresh cada 30s)</p>
      </div>

      {/* Usuarios */}
      <section>
        <h2 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Usuarios</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Metric label="Total" value={stats.users.total} icon="👥" />
          <Metric label="Activos" value={stats.users.active} icon="✓" />
          <Metric label="Inquilinos" value={stats.users.byRole.tenants} icon="🏠" />
          <Metric label="Propietarios" value={stats.users.byRole.landlords} icon="🏢" />
          <Metric label="Prestadores" value={stats.users.byRole.providers} icon="🛠" />
        </div>
      </section>

      {/* Operaciones */}
      <section>
        <h2 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Actividad</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Propiedades" value={stats.properties.total} sub={`${stats.properties.published} publicadas`} icon="🏘️" />
          <Metric label="Contratos activos" value={stats.contracts.active} icon="📄" />
          <Metric label="Pagos pendientes" value={stats.payments.pending} highlight={stats.payments.pending > 0} icon="💳" />
          <Metric label="Desperfectos abiertos" value={stats.issues.open} highlight={stats.issues.open > 0} icon="🚨" />
        </div>
      </section>

      {/* Casos críticos */}
      {stats.mediations.active > 0 && (
        <section className="card bg-amber-50 border-amber-200">
          <p className="font-semibold text-amber-900">
            ⚠️ Hay {stats.mediations.active} mediación(es) sin resolver
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Andá a Mediación para revisarlas.
          </p>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, sub, icon, highlight }: {
  label: string;
  value: number | string;
  sub?: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card ${highlight ? 'border-amber-200 bg-amber-50' : ''}`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
