'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  SERVICE_CATEGORY_GROUPS,
  SERVICE_CATEGORY_LABELS,
  GROUP_BY_ID,
} from '@/lib/serviceCategories';

/**
 * Marketplace de servicios del hogar.
 *
 * UX en 2 niveles:
 *   1) Browse — sin grupo elegido: 7 cards GRANDES con los grupos.
 *      Buscador grande arriba que matchea por nombre o rubro.
 *   2) Detail — con grupo elegido: breadcrumb, chips de subcategorías,
 *      filtro por ciudad y grid de prestadores.
 */
export default function ServicesMarketplacePage() {
  const [groupId, setGroupId]   = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [city, setCity]         = useState('');
  const [search, setSearch]     = useState('');

  const group = groupId ? GROUP_BY_ID[groupId] : null;
  const inGroup = !!group;

  // Buscamos cuando hay grupo elegido O cuando hay search libre con >=2 chars
  const queryEnabled = inGroup || search.trim().length >= 2;

  const { data, isLoading } = useQuery({
    queryKey: ['providers-search', category, city, search, groupId],
    queryFn: () =>
      servicesApi.searchProviders({
        category: category || undefined,
        city:     city     || undefined,
        // El backend filtra por category. Si solo hay grupo elegido (sin
        // categoría específica), el frontend filtra después por las cats
        // del grupo. Eso evita tener que cambiar el backend.
      }),
    enabled: queryEnabled,
  });

  const { data: myProfile } = useQuery({
    queryKey: ['my-provider-profile'],
    queryFn: servicesApi.getMyProviderProfile,
  });

  // Filtro client-side por grupo y por search libre
  const providers = (data?.data ?? data ?? []).filter((p: any) => {
    if (inGroup && !category) {
      // sólo grupo → filtramos por todas las cats del grupo
      const inThisGroup = group!.items.some(it => it.id === p.category);
      if (!inThisGroup) return false;
    }
    if (search.trim().length >= 2) {
      const q = search.trim().toLowerCase();
      const hay = [
        p.businessName ?? '',
        p.description ?? '',
        p.category ?? '',
        ...(p.cities ?? []),
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Métrica por grupo para mostrar count en las cards
  const groupCounts: Record<string, number> = {};
  // (Sin query global, el count es estimado — lo dejamos en blanco si no hay data)

  /* ─── MODO BROWSE (sin grupo y sin search) ─── */
  if (!inGroup && search.trim().length < 2) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader myProfile={myProfile} />

        {/* Buscador grande */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscá por rubro, nombre o palabra clave…"
            className="input w-full pl-12 py-4 text-base"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-habitta-stone" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        {/* Cards grandes por grupo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICE_CATEGORY_GROUPS.map(g => (
            <button
              key={g.id}
              onClick={() => { setGroupId(g.id); setCategory(''); }}
              className={`bg-gradient-to-br ${g.color} rounded-2xl p-5 text-left border-2 hover:shadow-md hover:scale-[1.01] transition-all`}
            >
              <div className="text-4xl mb-3">{g.icon}</div>
              <p className="font-extrabold text-habitta-deep text-base leading-tight mb-1">{g.title}</p>
              <p className="text-xs text-habitta-charcoal/70 leading-snug">{g.description}</p>
              <p className="text-[10px] uppercase tracking-wider text-habitta-stone mt-3 font-bold">
                {g.items.length} rubros →
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─── MODO RESULTADOS (grupo elegido o search activo) ─── */
  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <PageHeader myProfile={myProfile} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-habitta-charcoal flex-wrap">
        <button
          onClick={() => { setGroupId(''); setCategory(''); setSearch(''); }}
          className="hover:text-habitta-terra transition flex items-center gap-1"
        >
          ← Todos los servicios
        </button>
        {group && (
          <>
            <span className="text-habitta-stone">/</span>
            <span className="font-medium text-habitta-deep flex items-center gap-1">
              <span>{group.icon}</span> {group.title}
            </span>
          </>
        )}
        {search && (
          <span className="ml-auto text-xs text-habitta-stone">
            Buscando: <strong className="text-habitta-deep">"{search}"</strong>
          </span>
        )}
      </div>

      {/* Sub-chips del grupo (solo cuando hay grupo) + filtro ciudad */}
      <div className="bg-white border border-habitta-sand rounded-2xl p-4 space-y-3">
        {group && (
          <div>
            <p className="label">Rubro específico</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory('')}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  category === ''
                    ? 'bg-habitta-deep text-habitta-cream border-habitta-deep'
                    : 'bg-white text-habitta-deep border-habitta-olive/40 hover:border-habitta-terra'
                }`}
              >
                Todos los de {group.title.toLowerCase()}
              </button>
              {group.items.map(it => (
                <button
                  key={it.id}
                  onClick={() => setCategory(it.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    category === it.id
                      ? 'bg-habitta-terra text-habitta-cream border-habitta-terra shadow-sm'
                      : 'bg-white text-habitta-deep border-habitta-olive/40 hover:border-habitta-terra hover:bg-habitta-sand'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Ciudad / zona</label>
            <input
              className="input"
              placeholder="Ej: Capital Federal, San Isidro"
              value={city}
              onChange={e => setCity(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Búsqueda libre</label>
            <input
              className="input"
              placeholder="Nombre, palabra clave…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
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
        <>
          <p className="text-xs text-habitta-stone">
            <strong className="text-habitta-deep">{providers.length}</strong> prestador{providers.length !== 1 ? 'es' : ''} encontrado{providers.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p: any) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Header reutilizado ─── */
function PageHeader({ myProfile }: { myProfile: any }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-habitta-deep">Servicios del hogar</h1>
        <p className="text-habitta-charcoal/70 mt-1 text-sm">
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
  );
}

/* ─── Card de prestador ─── */
function ProviderCard({ provider: p }: { provider: any }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-habitta-deep">{p.businessName}</p>
          <p className="text-xs text-habitta-stone mt-0.5">
            {SERVICE_CATEGORY_LABELS[p.category] ?? p.category}
          </p>
        </div>
        {p.isVerified && (
          <span className="bg-habitta-eucalyptus/20 text-habitta-eucalyptus text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
            ✓ Verificado
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-habitta-charcoal/70 mt-2">
        {p.rating != null && p.rating > 0 ? (
          <span>⭐ {Number(p.rating).toFixed(1)} ({p.reviewCount ?? 0})</span>
        ) : (
          <span className="text-habitta-stone">Sin reseñas todavía</span>
        )}
        {p.cities?.length > 0 && (
          <span>📍 {p.cities.slice(0, 2).join(', ')}{p.cities.length > 2 ? ` +${p.cities.length - 2}` : ''}</span>
        )}
      </div>

      {p.description && (
        <p className="text-sm text-habitta-charcoal/80 mt-2 line-clamp-2">{p.description}</p>
      )}

      <div className="flex gap-2 mt-3 pt-3 border-t border-habitta-sand">
        <Link href={`/services/${p.id}`} className="btn-secondary text-sm flex-1 text-center">
          Ver perfil
        </Link>
        <Link href={`/services/${p.id}/contact`} className="btn-primary text-sm flex-1 text-center">
          Pedir presupuesto
        </Link>
      </div>
    </div>
  );
}
