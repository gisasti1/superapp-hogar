'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const ROLES = [
  { id: '', label: 'Todos' },
  { id: 'TENANT', label: 'Inquilinos' },
  { id: 'LANDLORD', label: 'Propietarios' },
  { id: 'PROVIDER', label: 'Prestadores' },
];

export default function AdminMarketingPage() {
  const [filters, setFilters] = useState({
    onlyEmailConsent: true,
    onlySmsConsent: false,
    role: '',
    city: '',
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-marketing-stats'],
    queryFn: adminApi.marketingStats,
  });

  const downloadMutation = useMutation({
    mutationFn: () => adminApi.downloadCsv(filters),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al exportar'),
  });

  if (isLoading || !stats) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Marketing</h1>
        <p className="text-gray-500 text-sm mt-1">
          Datos para campañas, Mailchimp, Meta Ads, Google Ads.
        </p>
      </div>

      {/* Métricas de consentimiento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Usuarios activos" value={stats.totalActive} icon="👥" />
        <Metric
          label="Consintieron email"
          value={`${stats.consents.email} (${stats.consents.emailPercent}%)`}
          icon="📧"
        />
        <Metric
          label="Consintieron SMS"
          value={`${stats.consents.sms} (${stats.consents.smsPercent}%)`}
          icon="📱"
        />
        <Metric
          label="Email + SMS"
          value={stats.consents.both}
          icon="✓"
        />
      </div>

      {/* Referral sources */}
      {stats.referrals?.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-3">¿Cómo se enteran de la app?</h2>
          <div className="space-y-2">
            {stats.referrals.map((r: any) => {
              const pct = stats.totalActive > 0 ? Math.round((r.count / stats.totalActive) * 100) : 0;
              return (
                <div key={r.source}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 capitalize">{r.source}</span>
                    <span className="text-gray-500">{r.count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export CSV */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-1">Exportar a CSV</h2>
        <p className="text-sm text-gray-500 mb-4">
          Descargá usuarios para importar a Mailchimp, Meta Ads, Google Ads o tu CRM.
          Por compliance (Ley AR 25.326) solo podés exportar usuarios que opt-inearon
          al canal correspondiente.
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.onlyEmailConsent}
              onChange={e => setFilters(f => ({ ...f, onlyEmailConsent: e.target.checked }))}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm text-gray-700">📧 Solo usuarios con consentimiento de email</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.onlySmsConsent}
              onChange={e => setFilters(f => ({ ...f, onlySmsConsent: e.target.checked }))}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm text-gray-700">📱 Solo usuarios con consentimiento de SMS</span>
          </label>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="label">Rol</label>
              <select
                className="input"
                value={filters.role}
                onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
              >
                {ROLES.map(r => <option key={r.id || 'all'} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input
                className="input"
                placeholder="Ej: Buenos Aires"
                value={filters.city}
                onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => downloadMutation.mutate()}
          disabled={downloadMutation.isPending}
          className="btn-primary w-full mt-4"
        >
          {downloadMutation.isPending ? 'Generando...' : '⬇️ Descargar CSV'}
        </button>

        <p className="text-xs text-gray-400 mt-2 text-center">
          El archivo incluye: email, nombre, teléfono, ciudad, ocupación, ingresos, consentimientos y más.
          Compatible con Mailchimp / Meta Audiences.
        </p>
      </div>

      {/* Recordatorios legales */}
      <div className="card bg-amber-50 border-amber-200 space-y-2">
        <p className="text-sm font-semibold text-amber-900">⚖️ Recordatorios legales</p>
        <ul className="text-xs text-amber-800 space-y-1 list-disc pl-5">
          <li>Solo podés contactar para marketing a usuarios que tildaron el consentimiento correspondiente.</li>
          <li>En cada email/SMS de marketing tiene que haber un link "darse de baja" funcional.</li>
          <li>Ley AR 25.326 — los usuarios pueden pedir export o borrado de sus datos en cualquier momento.</li>
          <li>Las suscripciones a Premium no son marketing — ahí podés contactar a todos por cuestiones del servicio.</li>
        </ul>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="card">
      <span className="text-xl">{icon}</span>
      <p className="text-xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
