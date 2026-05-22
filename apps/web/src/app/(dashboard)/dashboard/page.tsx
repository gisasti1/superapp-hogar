'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi, contractsApi, paymentsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { ContractStatus, PaymentStatus } from '@superapp/shared';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);

  const { data: profile } = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const { data: contracts } = useQuery({ queryKey: ['contracts'], queryFn: contractsApi.list });
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: paymentsApi.list });

  const activeContracts = contracts?.filter((c: any) => c.status === ContractStatus.ACTIVE) ?? [];
  const pendingPayments = payments?.filter((p: any) => p.status === PaymentStatus.PENDING) ?? [];

  const isVerified = profile?.verification?.status === 'VERIFIED';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1">Panel de control</p>
      </div>

      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-800">Verificá tu identidad</p>
            <p className="text-sm text-amber-700 mt-1">
              Completá el KYC para emitir pólizas y firmar contratos.
            </p>
            <a href="/kyc" className="text-sm font-semibold text-amber-700 underline mt-2 inline-block">
              Ir a verificación →
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Contratos activos" value={activeContracts.length} icon="📄" />
        <StatCard label="Pagos pendientes" value={pendingPayments.length} icon="💳" highlight={pendingPayments.length > 0} />
        <StatCard label="Plan" value={profile?.subscription?.plan ?? 'FREE'} icon="⭐" />
      </div>

      {pendingPayments.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Pagos próximos</h2>
          <div className="space-y-3">
            {pendingPayments.slice(0, 3).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{p.type}</p>
                  <p className="text-sm text-gray-500">
                    Vence: {new Date(p.dueDate).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <span className="font-bold text-gray-900">
                  ${Number(p.amount).toLocaleString('es-AR')} {p.currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: {
  label: string; value: string | number; icon: string; highlight?: boolean;
}) {
  return (
    <div className={`card ${highlight ? 'border-amber-200 bg-amber-50' : ''}`}>
      <span className="text-3xl">{icon}</span>
      <p className="text-3xl font-bold text-gray-900 mt-3">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
