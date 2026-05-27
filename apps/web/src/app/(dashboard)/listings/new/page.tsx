'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { listingsApi } from '@/lib/api';
import { AMENITY_GROUPS } from '@/lib/amenities';

export default function NewPropertyPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Previews locales sin subir nada todavía. Se revocan los blob URLs al cambiar.
  const photoPreviews = useMemo(
    () => photos.map(f => ({ name: f.name, url: URL.createObjectURL(f) })),
    [photos],
  );
  const [form, setForm] = useState({
    address: '',
    city: '',
    province: '',
    rooms: '2',
    bathrooms: '1',
    squareMeters: '',
    monthlyRent: '',
    expenses: '',
    currency: 'ARS',
    description: '',
    petsAllowed: false,
    amenities: [] as string[],
    latitude: '',
    longitude: '',
  });

  const toggleAmenity = (a: string) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
    }));
  };
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Geocoding con OpenStreetMap Nominatim — sin API key. Política: 1 req/seg, User-Agent obligatorio.
  // Docs: https://nominatim.org/release-docs/develop/api/Search/
  const geocode = async () => {
    setGeocodeError(null);
    setGeocoding(true);
    try {
      const q = `${form.address}, ${form.city}${form.province ? `, ${form.province}` : ''}, Argentina`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      if (!res.ok) throw new Error('No pudimos consultar el mapa. Probá de nuevo.');
      const data = await res.json();
      if (!data.length) {
        setGeocodeError('No encontramos esa dirección. Verificá la calle y ciudad, o ingresá lat/lng a mano.');
      } else {
        setForm(f => ({
          ...f,
          latitude: Number(data[0].lat).toFixed(6),
          longitude: Number(data[0].lon).toFixed(6),
        }));
      }
    } catch (e: any) {
      setGeocodeError(e?.message ?? 'Error al buscar la dirección');
    } finally {
      setGeocoding(false);
    }
  };

  const { mutate: createProperty, isPending } = useMutation({
    mutationFn: (dto: object) => listingsApi.createProperty(dto),
    onSuccess: async (created: any) => {
      // 1) Subir las fotos seleccionadas (si hay) antes de publicar.
      //    Si una falla no abortamos: el usuario puede subirlas después en el detalle.
      if (photos.length > 0) {
        setUploadingPhotos(true);
        try {
          await listingsApi.uploadImages(created.id, photos);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('No se pudieron subir las fotos:', e);
        } finally {
          setUploadingPhotos(false);
        }
      }
      // 2) Publicar inmediatamente después de crear
      try {
        await listingsApi.publish(created.id);
      } catch { /* silencioso — el usuario puede publicar después */ }
      router.push(`/listings/${created.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'No se pudo crear la propiedad'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createProperty({
      address: form.address,
      city: form.city,
      province: form.province || undefined,
      rooms: Number(form.rooms),
      bathrooms: Number(form.bathrooms),
      squareMeters: Number(form.squareMeters),
      monthlyRent: Number(form.monthlyRent),
      expenses: form.expenses ? Number(form.expenses) : undefined,
      currency: form.currency,
      description: form.description || undefined,
      petsAllowed: form.petsAllowed,
      amenities: form.amenities,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    });
  };

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/listings" className="text-sm text-gray-500 hover:text-gray-700">← Volver a inmuebles</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Publicar inmueble</h1>
        <p className="text-gray-500 mt-1">Completá los datos de tu propiedad. Una vez publicada los inquilinos podrán verla.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <div>
          <label className="label">Dirección *</label>
          <input
            name="address" required
            className="input"
            placeholder="Av. Corrientes 1234, Piso 3 Dto B"
            value={form.address}
            onChange={upd('address')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Ciudad *</label>
            <input
              name="city" required
              className="input"
              placeholder="Buenos Aires"
              value={form.city}
              onChange={upd('city')}
            />
          </div>
          <div>
            <label className="label">Provincia</label>
            <input
              name="province"
              className="input"
              placeholder="Buenos Aires"
              value={form.province}
              onChange={upd('province')}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Ambientes *</label>
            <select name="rooms" className="input" value={form.rooms} onChange={upd('rooms')}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Baños *</label>
            <select name="bathrooms" className="input" value={form.bathrooms} onChange={upd('bathrooms')}>
              {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">m² *</label>
            <input
              name="squareMeters" required type="number" min="1"
              className="input"
              placeholder="65"
              value={form.squareMeters}
              onChange={upd('squareMeters')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Alquiler mensual *</label>
            <input
              name="monthlyRent" required type="number" min="0"
              className="input"
              placeholder="350000"
              value={form.monthlyRent}
              onChange={upd('monthlyRent')}
            />
          </div>
          <div>
            <label className="label">Expensas</label>
            <input
              name="expenses" type="number" min="0"
              className="input"
              placeholder="35000"
              value={form.expenses}
              onChange={upd('expenses')}
            />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select name="currency" className="input" value={form.currency} onChange={upd('currency')}>
              <option value="ARS">ARS - Pesos</option>
              <option value="USD">USD - Dólares</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={geocode}
              disabled={geocoding || !form.address || !form.city}
              className="btn-secondary text-sm"
            >
              {geocoding ? '📍 Buscando...' : '📍 Buscar en mapa'}
            </button>
            <p className="text-xs text-gray-400 pb-2">
              Auto-completá lat/lng desde la dirección + ciudad
            </p>
          </div>
          {geocodeError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-2">
              {geocodeError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Latitud (opcional)</label>
              <input
                name="latitude" type="number" step="0.000001"
                className="input"
                placeholder="-34.6037"
                value={form.latitude}
                onChange={upd('latitude')}
              />
            </div>
            <div>
              <label className="label">Longitud (opcional)</label>
              <input
                name="longitude" type="number" step="0.000001"
                className="input"
                placeholder="-58.3816"
                value={form.longitude}
                onChange={upd('longitude')}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label">¿Acepta mascotas?</label>
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={form.petsAllowed}
              onChange={e => setForm(f => ({ ...f, petsAllowed: e.target.checked }))}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm text-gray-700">🐾 Permite mascotas</span>
          </label>
        </div>

        <div>
          <label className="label">Amenities</label>
          <p className="text-xs text-habitta-stone -mt-1 mb-3">
            Marcá todo lo que tenga el inmueble — agrupado por categoría.
          </p>
          <div className="space-y-3">
            {AMENITY_GROUPS.map(group => (
              <div key={group.title}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-habitta-stone mb-1.5">
                  {group.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAmenity(a.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.amenities.includes(a.id)
                          ? 'bg-habitta-terra text-white border-habitta-terra shadow-sm'
                          : 'bg-white text-habitta-deep border-habitta-olive/40 hover:border-habitta-terra hover:bg-habitta-sand'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Descripción</label>
          <textarea
            name="description"
            className="input min-h-[100px]"
            placeholder="Características destacadas del inmueble..."
            value={form.description}
            onChange={upd('description')}
          />
        </div>

        {/* ─── Fotos ──────────────────────────────────────────────── */}
        <div>
          <label className="label">Fotos del inmueble</label>
          <p className="text-xs text-gray-400 mb-2">
            Hasta 10 fotos · JPG, PNG, WEBP (5 MB c/u). Las primeras son las que más
            se ven en el listado.
          </p>

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {photoPreviews.map((p, idx) => (
                <div key={p.url} className="relative">
                  <img src={p.url} alt={p.name} className="h-24 w-full object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow"
                    title="Sacar"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={e => {
              const newFiles = Array.from(e.target.files ?? []);
              setPhotos(prev => [...prev, ...newFiles].slice(0, 10));
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-secondary text-sm"
            disabled={photos.length >= 10}
          >
            📷 {photos.length === 0 ? 'Agregar fotos' : `Agregar más (${photos.length}/10)`}
          </button>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={isPending || uploadingPhotos} className="btn-primary">
            {uploadingPhotos
              ? 'Subiendo fotos...'
              : isPending
                ? 'Publicando...'
                : 'Publicar inmueble'}
          </button>
          <Link href="/listings" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
