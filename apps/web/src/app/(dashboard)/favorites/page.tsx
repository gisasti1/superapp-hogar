'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const imgUrl = (u: string) =>
  !u ? '' : u.startsWith('http') ? u : `${API_BASE}${u}`;

export default function FavoritesPage() {
  const qc = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesApi.list,
  });

  const { mutate: remove } = useMutation({
    mutationFn: (propertyId: string) => favoritesApi.remove(propertyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['favorites-ids'] });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis favoritos</h1>
        <p className="text-gray-500 mt-1">
          {favorites.length === 0
            ? 'Guardá inmuebles desde la lista para acceder rápido.'
            : `${favorites.length} ${favorites.length === 1 ? 'inmueble guardado' : 'inmuebles guardados'}`}
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="❤️"
            title="Sin favoritos"
            description="Cuando veas un inmueble que te guste, tocá el corazón en su detalle para guardarlo acá."
            action={
              <Link href="/listings" className="btn-primary">Buscar inmuebles</Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav: any) => {
            const p = fav.property;
            const firstImage = p.images?.[0]?.url;
            const isPublished = p.listing?.isPublished;
            return (
              <div key={fav.id} className="card hover:shadow-md transition-shadow relative">
                <button
                  onClick={() => remove(p.id)}
                  className="absolute top-3 right-3 z-10 bg-white shadow rounded-full w-9 h-9 flex items-center justify-center hover:bg-red-50 text-red-500"
                  aria-label="Quitar de favoritos"
                >
                  ❤️
                </button>
                <Link href={isPublished ? `/listings/${p.listing.id}` : `/listings`}>
                  {firstImage ? (
                    <img
                      src={imgUrl(firstImage)}
                      alt={p.address}
                      className="h-40 w-full object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-brand-100 to-brand-200 rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-5xl">🏠</span>
                    </div>
                  )}
                  <p className="font-semibold text-gray-900 line-clamp-1">{p.address}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{p.city}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="font-bold text-brand-600">
                      ${Number(p.monthlyRent).toLocaleString('es-AR')}
                      <span className="text-xs font-normal text-gray-500"> {p.currency}/mes</span>
                    </p>
                    <span className="text-xs text-gray-400">
                      {p.rooms} amb · {p.squareMeters}m²
                    </span>
                  </div>
                  {!isPublished && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ Este inmueble ya no está publicado
                    </p>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
