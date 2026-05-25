'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminPropertiesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['admin-properties', search],
    queryFn: () => adminApi.listProperties({ search: search || undefined }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => adminApi.forceUnpublishProperty(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-properties'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProperty(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-properties'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Propiedades</h1>
        <p className="text-gray-500 text-sm mt-1">Gestionar inmuebles publicados</p>
      </div>

      <div className="card">
        <input
          className="input"
          placeholder="Buscar por dirección o ciudad..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : properties.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">Sin resultados</div>
      ) : (
        <div className="space-y-3">
          {properties.map((p: any) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{p.address}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.city} · ${Number(p.monthlyRent).toLocaleString('es-AR')} {p.currency}/mes · {p.rooms} amb · {p.squareMeters}m²
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Dueño: {p.owner.firstName} {p.owner.lastName} ({p.owner.email})
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {p.listing?.isPublished ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Publicado · {p.listing.views} vistas</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Despublicado</span>
                    )}
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p._count.contracts} contratos</span>
                    {p._count.issues > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">⚠ {p._count.issues} issues</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {p.listing && (
                    <Link href={`/listings/${p.listing.id}`} className="text-xs text-brand-600 hover:underline text-right">
                      Ver detalle →
                    </Link>
                  )}
                  {p.listing?.isPublished && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Despublicar "${p.address}"?`)) unpublishMutation.mutate(p.id);
                      }}
                      className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200"
                    >
                      Despublicar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar "${p.address}"? Bloqueado si tiene contratos activos.`)) {
                        deleteMutation.mutate(p.id);
                      }
                    }}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
