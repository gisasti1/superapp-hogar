'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { listingsApi } from '@/lib/api';

export default function NewPropertyPage() {
  const router = useRouter();
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

  const { mutate: createProperty, isPending } = useMutation({
    mutationFn: (dto: object) => listingsApi.createProperty(dto),
    onSuccess: async (created: any) => {
      // Publicar inmediatamente después de crear
      try {
        await listingsApi.publish(created.id);
      } catch { /* silencioso — el usuario puede publicar después */ }
      router.push('/listings');
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Latitud (opcional)</label>
            <input
              name="latitude" type="number" step="0.0001"
              className="input"
              placeholder="-34.6037"
              value={form.latitude}
              onChange={upd('latitude')}
            />
          </div>
          <div>
            <label className="label">Longitud (opcional)</label>
            <input
              name="longitude" type="number" step="0.0001"
              className="input"
              placeholder="-58.3816"
              value={form.longitude}
              onChange={upd('longitude')}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-3">
          💡 Tip: las coordenadas son opcionales pero permiten mostrar el inmueble en el mapa.
        </p>

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
          <div className="flex flex-wrap gap-2 mt-1">
            {[
              { id: 'pool', label: '🏊 Pileta' },
              { id: 'gym', label: '🏋️ Gimnasio' },
              { id: 'bbq', label: '🍖 Parrilla' },
              { id: 'parking', label: '🚗 Cochera' },
              { id: 'doorman', label: '👔 Portería' },
              { id: 'laundry', label: '🧺 Lavadero' },
              { id: 'balcony', label: '🌅 Balcón' },
              { id: 'garden', label: '🌿 Jardín' },
              { id: 'elevator', label: '🛗 Ascensor' },
            ].map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAmenity(a.id)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  form.amenities.includes(a.id)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                }`}
              >
                {a.label}
              </button>
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

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Publicando...' : 'Publicar inmueble'}
          </button>
          <Link href="/listings" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
