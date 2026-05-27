'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { premiumApi } from '@/lib/api';

const FREE_FEATURES = [
  'Contrato digital',
  'Pagos automáticos mensuales',
  'Seguro de caución',
  'Mediación IA (1 caso/año)',
  'Marketplace de servicios',
];

const PREMIUM_FEATURES = [
  'Todo lo de Free',
  'Mediación IA ilimitada',
  'Asesoría legal por chat (sin límite)',
  'Auditoría automática de expensas',
  'Soporte prioritario 24hs',
  'Alertas personalizadas de inmuebles',
  'Reportes exportables PDF/Excel',
];

export default function PremiumPage() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: premiumApi.getSubscription,
  });

  const { mutate: subscribe, isPending } = useMutation({
    mutationFn: premiumApi.subscribe,
    onSuccess: (data: any) => {
      if (data?.redirectUrl) window.open(data.redirectUrl, '_blank');
    },
  });

  const { mutate: cancel } = useMutation({
    mutationFn: premiumApi.cancel,
  });

  const isPremium = subscription?.plan === 'PREMIUM' && subscription?.status === 'ACTIVE';

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plan Premium</h1>
        <p className="text-gray-500 mt-1">Accedé a todas las funciones de Habitta</p>
      </div>

      {isPremium && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <p className="font-semibold text-green-800">Sos Premium</p>
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-green-700">
                Próxima renovación: {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-AR')}
              </p>
            )}
          </div>
          <button
            onClick={() => cancel()}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Cancelar plan
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FREE */}
        <div className="card border-gray-200">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Free</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">$0</p>
            <p className="text-sm text-gray-500">para siempre</p>
          </div>
          <ul className="space-y-2 mb-6">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-gray-400">○</span> {f}
              </li>
            ))}
          </ul>
          {!isPremium && (
            <span className="inline-block w-full text-center py-2 text-sm text-gray-500 border border-gray-200 rounded-lg">
              Plan actual
            </span>
          )}
        </div>

        {/* PREMIUM */}
        <div className="card border-2 border-habitta-terra relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-habitta-terra text-white text-xs font-bold px-3 py-1 rounded-full">
              RECOMENDADO
            </span>
          </div>
          <div className="mb-4">
            <p className="text-sm font-semibold text-habitta-terra uppercase tracking-wide">Premium</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">USD 5</p>
            <p className="text-sm text-gray-500">por mes</p>
          </div>
          <ul className="space-y-2 mb-6">
            {PREMIUM_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-green-500 font-bold">✓</span> {f}
              </li>
            ))}
          </ul>
          {isPremium ? (
            <span className="btn-primary w-full text-center cursor-default opacity-75">
              Plan activo ✅
            </span>
          ) : (
            <button
              onClick={() => subscribe('PREMIUM')}
              disabled={isPending}
              className="btn-primary w-full"
            >
              {isPending ? 'Procesando...' : 'Suscribirse a Premium →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
