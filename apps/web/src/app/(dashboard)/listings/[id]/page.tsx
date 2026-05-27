'use client';

import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { listingsApi, favoritesApi, rentalRequestsApi, visitsApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PropertyMap } from '@/components/PropertyMap';
import { useAuthStore } from '@/stores/auth.store';
import Link from 'next/link';
import { useState } from 'react';

import { AMENITY_LABELS } from '@/lib/amenities';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function imgUrl(u: string): string {
  if (!u) return '';
  if (u.startsWith('http')) return u;
  if (u.startsWith('/uploads/')) return `${API_BASE}${u}`;
  return u;
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(id),
  });

  const { mutate: publish, isPending: isPublishing } = useMutation({
    mutationFn: () => listingsApi.publish(listing?.propertyId ?? id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listing', id] }),
  });

  const { mutate: unpublish, isPending: isUnpublishing } = useMutation({
    mutationFn: () => listingsApi.unpublish(listing!.propertyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listing', id] }),
  });

  const { mutate: deleteProperty, isPending: isDeleting } = useMutation({
    mutationFn: () => listingsApi.deleteProperty(listing!.propertyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] });
      qc.invalidateQueries({ queryKey: ['my-properties'] });
      router.push('/listings');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message ?? 'No se pudo eliminar el inmueble');
    },
  });

  // Favorito (corazón): leer IDs y togglear
  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorites-ids'],
    queryFn: favoritesApi.listIds,
    enabled: !!user,
  });

  const { mutate: toggleFavorite, isPending: isFavoriting } = useMutation({
    mutationFn: () => favoritesApi.toggle(listing!.propertyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites-ids'] }),
  });

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const { mutate: sendRequest, isPending: isRequesting } = useMutation({
    mutationFn: () =>
      rentalRequestsApi.create(listing!.propertyId, { message: requestMessage }),
    onSuccess: () => {
      setRequestSent(true);
      setShowRequestForm(false);
      qc.invalidateQueries({ queryKey: ['rental-requests'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message ?? 'No se pudo enviar la solicitud');
    },
  });

  const { mutate: uploadImages, isPending: isUploading } = useMutation({
    mutationFn: (files: File[]) => listingsApi.uploadImages(listing!.propertyId, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listing', id] });
      if (fileInput.current) fileInput.current.value = '';
    },
  });

  const { mutate: deleteImage } = useMutation({
    mutationFn: (imageId: string) => listingsApi.deleteImage(listing!.propertyId, imageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listing', id] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!listing) return <p className="text-gray-500">Inmueble no encontrado.</p>;

  const property = {
    ...listing.property,
    listing: { id: listing.id, isPublished: listing.isPublished, views: listing.views },
  };

  const isOwner = property.ownerId === user?.id;
  const images = property.images ?? [];
  const isFavorited = favoriteIds.includes(property.id);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadImages(files);
  };

  return (
    <div className="space-y-6">
      {/* Galería */}
      <div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.length ? (
            images.map((img: any) => (
              <div key={img.id} className="relative flex-shrink-0">
                <img
                  src={imgUrl(img.url)}
                  alt="Foto del inmueble"
                  className="h-52 w-80 object-cover rounded-xl"
                />
                {isOwner && (
                  <button
                    onClick={() => { if (confirm('¿Eliminar esta foto?')) deleteImage(img.id); }}
                    className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full hover:bg-red-600 shadow"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="h-52 w-full bg-gradient-to-br from-habitta-beige/40 to-habitta-eucalyptus/30 rounded-xl flex items-center justify-center">
              <span className="text-6xl">🏠</span>
            </div>
          )}
        </div>

        {isOwner && (
          <div className="mt-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="upload-images"
            />
            <label
              htmlFor="upload-images"
              className={`btn-secondary inline-flex items-center gap-2 cursor-pointer text-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              📷 {isUploading ? 'Subiendo...' : 'Subir fotos'}
            </label>
            <span className="text-xs text-gray-400 ml-3">Hasta 10 fotos · JPG, PNG, WEBP (5 MB c/u)</span>
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

          {(property.amenities?.length > 0 || property.petsAllowed) && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {property.petsAllowed && (
                  <span className="bg-habitta-sand text-habitta-earth text-sm font-medium px-3 py-1 rounded-full">
                    🐾 Acepta mascotas
                  </span>
                )}
                {property.amenities?.map((a: string) => (
                  <span key={a} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                    {AMENITY_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {property.latitude != null && property.longitude != null && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-3">Ubicación</h2>
              <PropertyMap
                latitude={Number(property.latitude)}
                longitude={Number(property.longitude)}
                address={property.address}
                height="320px"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <p className="text-2xl font-bold text-habitta-terra">
              ${Number(property.monthlyRent).toLocaleString('es-AR')}
              <span className="text-sm font-normal text-gray-500"> {property.currency}/mes</span>
            </p>
            {property.expenses != null && Number(property.expenses) > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                + ${Number(property.expenses).toLocaleString('es-AR')} {property.currency} de expensas
              </p>
            )}

            {!isOwner ? (
              <div className="space-y-2 mt-4">
                {requestSent ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 text-center">
                    ✓ Solicitud enviada. Te avisamos cuando el propietario responda.
                    <Link href="/rental-requests" className="block underline mt-1">
                      Ver mis solicitudes
                    </Link>
                  </div>
                ) : !showRequestForm ? (
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="btn-primary w-full"
                  >
                    📨 Solicitar alquiler
                  </button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-amber-900 font-medium">
                      Mensaje al propietario:
                    </p>
                    <textarea
                      className="input text-sm min-h-[80px]"
                      placeholder="Hola, me interesa el inmueble. Soy [tu situación: trabajo, familia, mascotas, fecha de mudanza...]"
                      value={requestMessage}
                      onChange={e => setRequestMessage(e.target.value)}
                      maxLength={2000}
                      minLength={20}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendRequest()}
                        disabled={isRequesting || requestMessage.length < 20}
                        className="btn-primary flex-1 text-sm"
                      >
                        {isRequesting ? 'Enviando...' : 'Enviar solicitud'}
                      </button>
                      <button
                        onClick={() => setShowRequestForm(false)}
                        className="btn-secondary text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                <RequestVisitButton propertyId={property.id} />

                <a
                  href={`mailto:?subject=Consulta por inmueble en ${property.address}`}
                  className="btn-secondary w-full text-center block text-sm"
                >
                  Contactar por email
                </a>
                <button
                  onClick={() => toggleFavorite()}
                  disabled={isFavoriting}
                  className={`w-full transition-colors ${
                    isFavorited
                      ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                      : 'btn-secondary'
                  } rounded-lg px-4 py-2 text-sm font-medium`}
                >
                  {isFavorited ? '❤️ En favoritos' : '🤍 Guardar en favoritos'}
                </button>
                <Link
                  href={`/issues/new?propertyId=${property.id}`}
                  className="block w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1.5"
                >
                  🛠 Reportar un desperfecto
                </Link>
              </div>
            ) : (
              <div className="space-y-2 mt-4">
                <div className={`text-center text-sm font-semibold py-2 px-3 rounded-lg ${property.listing?.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {property.listing?.isPublished ? '✅ Publicado' : '🚫 Sin publicar'}
                </div>
                {property.listing?.isPublished ? (
                  <button
                    onClick={() => unpublish()}
                    disabled={isUnpublishing}
                    className="btn-secondary w-full"
                  >
                    {isUnpublishing ? 'Despublicando...' : 'Despublicar'}
                  </button>
                ) : (
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
                <button
                  onClick={() => {
                    if (confirm('¿Eliminar este inmueble? Esta acción no se puede deshacer.\nNo se puede eliminar si hay contratos activos.')) {
                      deleteProperty();
                    }
                  }}
                  disabled={isDeleting}
                  className="w-full text-xs text-red-600 hover:text-red-700 py-1.5"
                >
                  {isDeleting ? 'Eliminando...' : '🗑 Eliminar inmueble'}
                </button>
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

/* ─── Pedir visita ─── */
function RequestVisitButton({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const minDate = (() => {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset() + 60);
    return d.toISOString().slice(0,16);
  })();

  const mut = useMutation({
    mutationFn: () => visitsApi.create({
      propertyId,
      proposedDate: new Date(date).toISOString(),
      message,
    }),
    onSuccess: () => setSent(true),
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error al pedir la visita'),
  });

  if (sent) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg p-3 text-center space-y-1">
        ✓ Visita propuesta. Esperá la confirmación.
        <Link href="/visits" className="block underline">Ver mis visitas →</Link>
      </div>
    );
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary w-full text-sm">
        📅 Pedir visita
      </button>
    );
  }
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
      <p className="text-xs font-bold text-indigo-700">Proponé fecha y hora</p>
      <input
        type="datetime-local"
        className="input"
        value={date}
        min={minDate}
        onChange={e => setDate(e.target.value)}
      />
      <textarea
        className="input min-h-[60px] text-sm"
        placeholder="Mensaje opcional (ej: ¿podemos ir con la pareja?)"
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={() => mut.mutate()}
          disabled={!date || mut.isPending}
          className="btn-primary flex-1 text-sm"
        >
          {mut.isPending ? 'Enviando…' : 'Enviar propuesta'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-secondary text-sm">Cancelar</button>
      </div>
    </div>
  );
}
