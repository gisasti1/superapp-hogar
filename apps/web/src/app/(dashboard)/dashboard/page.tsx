'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { authApi, contractsApi, paymentsApi, listingsApi, servicesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { ContractStatus, PaymentStatus } from '@superapp/shared';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);

  const { data: profile } = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const { data: contracts } = useQuery({ queryKey: ['contracts'], queryFn: contractsApi.list });
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: paymentsApi.list });
  const { data: myProperties } = useQuery({
    queryKey: ['my-properties'],
    queryFn: listingsApi.getMyProperties,
  });
  const { data: myProviderProfile } = useQuery({
    queryKey: ['my-provider-profile'],
    queryFn: servicesApi.getMyProviderProfile,
  });

  const activeContracts = contracts?.filter((c: any) => c.status === ContractStatus.ACTIVE) ?? [];
  const pendingPayments = payments?.filter((p: any) => p.status === PaymentStatus.PENDING) ?? [];

  const isVerified = profile?.verification?.status === 'VERIFIED';
  const hasProperties = (myProperties?.length ?? 0) > 0;
  const isProvider = !!myProviderProfile;

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
              Confirmá tu identidad — un paso rápido, igual que en tu banco. Después podés firmar contratos y emitir pólizas.
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

      {/* CTAs principales — siempre visibles, accionables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CTACard
          icon="🏘️"
          title={hasProperties ? 'Publicar otro inmueble' : '¿Tenés un inmueble?'}
          description={hasProperties ? 'Sumá una propiedad nueva al marketplace.' : 'Publicalo gratis y empezá a recibir solicitudes de alquiler.'}
          href="/listings/new"
          ctaLabel={hasProperties ? '+ Nuevo inmueble' : '🏠 Publicar inmueble'}
          color="brand"
        />
        <CTACard
          icon="🛠"
          title={isProvider ? 'Mi perfil de prestador' : '¿Ofrecés servicios del hogar?'}
          description={isProvider ? 'Editá tu perfil, zonas o rubro.' : 'Sumate como gasista, plomero, electricista, pintor y recibí pedidos.'}
          href="/provider"
          ctaLabel={isProvider ? '⚙️ Editar perfil' : '🛠 Ofrecer mis servicios'}
          color="indigo"
        />
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

function CTACard({ icon, title, description, href, ctaLabel, color }: {
  icon: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  color: 'brand' | 'indigo';
}) {
  const colorClasses = color === 'brand'
    ? 'border-habitta-olive/30 bg-habitta-sand hover:bg-habitta-beige/40'
    : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100';
  const btnClasses = color === 'brand'
    ? 'bg-habitta-terra hover:bg-habitta-earth text-white'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  return (
    <Link href={href} className={`card transition-colors ${colorClasses} block`}>
      <span className="text-3xl">{icon}</span>
      <p className="font-bold text-gray-900 mt-2 text-base">{title}</p>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
      <span className={`inline-block mt-3 px-4 py-2 rounded-lg text-sm font-medium ${btnClasses}`}>
        {ctaLabel}
      </span>
    </Link>
  );
}
