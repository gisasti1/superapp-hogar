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
    currency: 'ARS',
    description: '',
  });
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
      currency: form.currency,
      description: form.description || undefined,
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="label">Moneda</label>
            <select name="currency" className="input" value={form.currency} onChange={upd('currency')}>
              <option value="ARS">ARS - Pesos</option>
              <option value="USD">USD - Dólares</option>
            </select>
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
