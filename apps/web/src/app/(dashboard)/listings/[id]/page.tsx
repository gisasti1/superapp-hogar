'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { listingsApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/stores/auth.store';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore(s => s.user);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(id),
  });

  const { mutate: publish, isPending: isPublishing } = useMutation({
    mutationFn: () => listingsApi.publish(listing?.propertyId ?? id),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!listing) return <p className="text-gray-500">Inmueble no encontrado.</p>;

  // El backend devuelve Listing con .property anidada
  const property = {
    ...listing.property,
    listing: { id: listing.id, isPublished: listing.isPublished, views: listing.views },
  };

  const isOwner = property.ownerId === user?.id;

  return (
    <div className="space-y-6">
      {/* Galería */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {property.images?.length ? (
          property.images.map((img: any, i: number) => (
            <img key={i} src={img.url} alt="Foto del inmueble" className="h-52 w-80 object-cover rounded-xl flex-shrink-0" />
          ))
        ) : (
          <div className="h-52 w-full bg-gradient-to-br from-brand-100 to-brand-200 rounded-xl flex items-center justify-center">
            <span className="text-6xl">🏠</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Datos principales */}
        <div className="md:col-span-2 space-y-4">
          <div className="card">
            <h1 className="text-xl font-bold text-gray-900">{property.address}</h1>
            <p className="text-gray-500 mt-1">{property.city}, {property.province}</p>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <Stat label="Ambientes" value={property.rooms} />
              <Stat label="Baños" value={property.bathrooms} />
              <Stat label="Superficie" value={`${property.squareMeters} m²`} />
            </div>
          </div>

          {property.description && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-2">Descripción</h2>
              <p className="text-gray-600 leading-relaxed">{property.description}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <p className="text-2xl font-bold text-brand-600">
              ${Number(property.monthlyRent).toLocaleString('es-AR')}
              <span className="text-sm font-normal text-gray-500"> {property.currency}/mes</span>
            </p>

            {!isOwner ? (
              <div className="space-y-2 mt-4">
                <a
                  href={`mailto:?subject=Consulta por inmueble en ${property.address}`}
                  className="btn-primary w-full text-center block"
                >
                  Contactar propietario
                </a>
                <button className="btn-secondary w-full">
                  ♡ Guardar en favoritos
                </button>
              </div>
            ) : (
              <div className="space-y-2 mt-4">
                <div className={`text-center text-sm font-semibold py-2 px-3 rounded-lg ${property.listing?.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {property.listing?.isPublished ? '✅ Publicado' : 'Sin publicar'}
                </div>
                {!property.listing?.isPublished && (
                  <button
                    onClick={() => publish()}
                    disabled={isPublishing}
                    className="btn-primary w-full"
                  >
                    {isPublishing ? 'Publicando...' : 'Publicar en listings'}
                  </button>
                )}
                {property.listing && (
                  <p className="text-xs text-center text-gray-500">
                    {property.listing.views} visitas
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
