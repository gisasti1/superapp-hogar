'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { listingsApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/stores/auth.store';

export default function ListingsPage() {
  const user = useAuthStore(s => s.user);
  const [filters, setFilters] = useState({ city: '', minRooms: '', maxRent: '', currency: 'ARS' });

  const { data: listingsResponse, isLoading } = useQuery({
    queryKey: ['listings', filters],
    queryFn: () => {
      // limpiar valores vacíos antes de mandar al backend (que valida tipos)
      const clean: Record<string, string | number> = {};
      if (filters.city) clean.city = filters.city;
      if (filters.minRooms) clean.minRooms = Number(filters.minRooms);
      if (filters.maxRent) clean.maxRent = Number(filters.maxRent);
      if (filters.currency) clean.currency = filters.currency;
      return listingsApi.search(clean);
    },
  });

  // El backend devuelve { data: Listing[], pagination }
  // Cada Listing trae .property anidada con address, city, rooms, etc.
  const listings = (listingsResponse?.data ?? []).map((l: any) => ({
    id: l.id,
    title: l.title,
    address: l.property?.address ?? l.title,
    city: l.property?.city,
    rooms: l.property?.rooms,
    squareMeters: l.property?.squareMeters,
    monthlyRent: l.property?.monthlyRent,
    currency: l.property?.currency,
  }));

  const { data: myProperties } = useQuery({
    queryKey: ['my-properties'],
    queryFn: listingsApi.getMyProperties,
    enabled: user?.role === 'LANDLORD' || user?.role === 'REALTOR',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inmuebles</h1>
          <p className="text-gray-500 mt-1">Encontrá tu próximo hogar</p>
        </div>
        {(user?.role === 'LANDLORD' || user?.role === 'REALTOR') && (
          <Link href="/listings/new" className="btn-primary">
            + Publicar inmueble
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Ciudad</label>
            <input
              className="input"
              placeholder="Ej. Buenos Aires"
              value={filters.city}
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Ambientes mínimos</label>
            <select
              className="input"
              value={filters.minRooms}
              onChange={e => setFilters(f => ({ ...f, minRooms: e.target.value }))}
            >
              <option value="">Cualquiera</option>
              {[1, 2, 3, 4].map(n => (
                <option key={n} value={n}>{n}{n === 4 ? '+' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Precio máximo</label>
            <input
              className="input"
              type="number"
              placeholder="Sin límite"
              value={filters.maxRent}
              onChange={e => setFilters(f => ({ ...f, maxRent: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select
              className="input"
              value={filters.currency}
              onChange={e => setFilters(f => ({ ...f, currency: e.target.value }))}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : !listings?.length ? (
        <EmptyState
          icon="🏠"
          title="No hay inmuebles disponibles"
          description="No encontramos propiedades con esos filtros. Probá ajustando la búsqueda."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((p: any) => (
            <Link key={p.id} href={`/listings/${p.id}`} className="card hover:shadow-md transition-shadow group">
              <div className="h-40 bg-gradient-to-br from-brand-100 to-brand-200 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-5xl">🏠</span>
              </div>
              <p className="font-bold text-gray-900 group-hover:text-brand-600 transition-colors" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {p.address}
              </p>
              <p className="text-sm text-gray-500 mt-1">{p.city}</p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-lg font-bold text-brand-600">
                  ${Number(p.monthlyRent).toLocaleString('es-AR')} {p.currency}/mes
                </p>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{p.rooms} amb.</span>
                  <span>{p.squareMeters} m²</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Mis propiedades (landlords) */}
      {myProperties?.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Mis propiedades</h2>
          <div className="space-y-3">
            {myProperties.map((p: any) => (
              <div key={p.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{p.address}</p>
                  <p className="text-sm text-gray-500">{p.city} · {p.rooms} amb. · {p.squareMeters} m²</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.listing?.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.listing?.isPublished ? 'Publicado' : 'Sin publicar'}
                  </span>
                  <Link href={`/listings/${p.id}`} className="btn-secondary text-xs py-1.5 px-3">
                    Ver
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
