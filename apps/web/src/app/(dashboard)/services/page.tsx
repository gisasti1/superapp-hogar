'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

const CATEGORIES = [
  { id: '', label: 'Todos' },
  { id: 'PLUMBER', label: '🚰 Plomero' },
  { id: 'ELECTRICIAN', label: '⚡ Electricista' },
  { id: 'GAS', label: '🔥 Gasista' },
  { id: 'PAINTER', label: '🎨 Pintor' },
  { id: 'CARPENTER', label: '🪚 Carpintero' },
  { id: 'LOCKSMITH', label: '🔑 Cerrajero' },
  { id: 'AC_TECHNICIAN', label: '❄️ Aire' },
  { id: 'CLEANER', label: '🧹 Limpieza' },
  { id: 'GARDENER', label: '🌿 Jardín' },
  { id: 'MOVER', label: '📦 Mudanzas' },
  { id: 'PEST_CONTROL', label: '🪳 Plagas' },
  { id: 'APPLIANCE_REPAIR', label: '🔌 Reparaciones' },
  { id: 'GENERAL', label: '🛠 Generales' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter(c => c.id).map(c => [c.id, c.label]),
);

export default function ServicesMarketplacePage() {
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['providers-search', category, city],
    queryFn: () =>
      servicesApi.searchProviders({
        category: category || undefined,
        city: city || undefined,
      }),
  });

  const { data: myProfile } = useQuery({
    queryKey: ['my-provider-profile'],
    queryFn: servicesApi.getMyProviderProfile,
  });

  const providers = data?.data ?? data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios del hogar</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Plomeros, electricistas, gasistas y más — verificados y con reseñas.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/services/bookings" className="btn-secondary text-center text-sm">
            📋 Mis reservas
          </Link>
          {myProfile ? (
            <Link href="/provider" className="btn-secondary text-center text-sm">
              ⚙️ Editar perfil
            </Link>
          ) : (
            <Link href="/provider" className="btn-primary text-center text-sm">
              🛠 Ofrecer mis servicios
            </Link>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="card space-y-4">
        <div>
          <label className="label">Rubro</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id || 'all'}
                onClick={() => setCategory(c.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  category === c.id
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Ciudad / zona</label>
          <input
            className="input"
            placeholder="Ej: Capital Federal, San Isidro"
            value={city}
            onChange={e => setCity(e.target.value)}
          />
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : providers.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🛠"
            title="Sin prestadores"
            description={
              myProfile
                ? 'Probá ajustando los filtros o invitá a más prestadores a registrarse.'
                : 'Aún no hay prestadores en este rubro/zona. ¿Sos vos? Registrate y aparecé acá.'
            }
            action={
              !myProfile ? (
                <Link href="/provider" className="btn-primary">Registrarme como prestador</Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((p: any) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{p.businessName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {CATEGORY_LABELS[p.category] ?? p.category}
                  </p>
                </div>
                {p.isVerified && (
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    ✓ Verificado
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                {p.rating != null && p.rating > 0 ? (
                  <span>⭐ {Number(p.rating).toFixed(1)} ({p.reviewCount ?? 0})</span>
                ) : (
                  <span className="text-gray-400">Sin reseñas todavía</span>
                )}
                {p.cities?.length > 0 && (
                  <span>📍 {p.cities.slice(0, 2).join(', ')}{p.cities.length > 2 ? ` +${p.cities.length - 2}` : ''}</span>
                )}
              </div>

              {p.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.description}</p>
              )}

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <Link
                  href={`/services/${p.id}`}
                  className="btn-secondary text-sm flex-1 text-center"
                >
                  Ver perfil
                </Link>
                <Link
                  href={`/services/${p.id}/contact`}
                  className="btn-primary text-sm flex-1 text-center"
                >
                  Pedir presupuesto
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
