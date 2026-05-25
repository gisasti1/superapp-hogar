'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const CATEGORIES = [
  { id: 'PLUMBER', label: '🚰 Plomero' },
  { id: 'ELECTRICIAN', label: '⚡ Electricista' },
  { id: 'GAS', label: '🔥 Gasista' },
  { id: 'PAINTER', label: '🎨 Pintor' },
  { id: 'CARPENTER', label: '🪚 Carpintero' },
  { id: 'LOCKSMITH', label: '🔑 Cerrajero' },
  { id: 'AC_TECHNICIAN', label: '❄️ Aire / refrigeración' },
  { id: 'CLEANER', label: '🧹 Limpieza' },
  { id: 'GARDENER', label: '🌿 Jardinería' },
  { id: 'MOVER', label: '📦 Mudanzas' },
  { id: 'PEST_CONTROL', label: '🪳 Control de plagas' },
  { id: 'APPLIANCE_REPAIR', label: '🔌 Reparación electrodomésticos' },
  { id: 'GENERAL', label: '🛠 Servicios generales' },
];

export default function ProviderProfilePage() {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-provider-profile'],
    queryFn: servicesApi.getMyProviderProfile,
  });

  const [form, setForm] = useState({
    businessName: '',
    category: 'PLUMBER',
    description: '',
    citiesInput: '',
    isActive: true,
  });
  const [saved, setSaved] = useState(false);

  // Cuando carga el perfil existente, lo prelleno en el form
  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName ?? '',
        category: profile.category ?? 'PLUMBER',
        description: profile.description ?? '',
        citiesInput: (profile.cities ?? []).join(', '),
        isActive: profile.isActive ?? true,
      });
    }
  }, [profile]);

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: () =>
      servicesApi.upsertMyProviderProfile({
        businessName: form.businessName.trim(),
        category: form.category,
        description: form.description.trim() || undefined,
        cities: form.citiesInput
          .split(',')
          .map(c => c.trim())
          .filter(Boolean),
        isActive: form.isActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-provider-profile'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save();
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  const isNew = !profile;
  const errMsg = (error as any)?.response?.data?.message;
  const errStr = Array.isArray(errMsg) ? errMsg.join(' · ') : errMsg;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Ofrecé tus servicios' : 'Mi perfil de prestador'}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {isNew
            ? 'Registrate como prestador para aparecer en el marketplace de servicios. Propietarios e inquilinos te van a poder contactar.'
            : 'Editá los datos de tu negocio para que clientes te encuentren.'}
        </p>
      </div>

      {!isNew && (
        <div className="card flex items-center justify-between bg-green-50 border-green-200">
          <div>
            <p className="text-sm font-semibold text-green-900">✓ Sos prestador activo</p>
            <p className="text-xs text-green-700 mt-0.5">
              ⭐ {profile.rating?.toFixed(1) ?? '—'} ({profile.reviewCount ?? 0} reseñas)
            </p>
          </div>
          <Link href="/services" className="text-sm text-green-700 underline">
            Ver marketplace →
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        {errStr && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {errStr}
          </div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
            ✓ Guardado correctamente
          </div>
        )}

        <div>
          <label className="label">Nombre comercial *</label>
          <input
            className="input"
            placeholder="Ej: Plomería del Centro, Electricista Juan Pérez"
            value={form.businessName}
            onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
            required
            minLength={3}
            maxLength={80}
          />
        </div>

        <div>
          <label className="label">Categoría *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: c.id }))}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  form.category === c.id
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
          <label className="label">Ciudades / zonas donde trabajás *</label>
          <input
            className="input"
            placeholder="Capital Federal, San Isidro, Vicente López"
            value={form.citiesInput}
            onChange={e => setForm(f => ({ ...f, citiesInput: e.target.value }))}
            required
          />
          <p className="text-xs text-gray-400 mt-1">Separá con comas. Sólo vas a aparecer cuando alguien busque en esas zonas.</p>
        </div>

        <div>
          <label className="label">Descripción</label>
          <textarea
            className="input min-h-[120px]"
            placeholder="Contá tu experiencia, qué servicios específicos ofrecés, formación, certificaciones, horarios..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            maxLength={2000}
          />
        </div>

        {!isNew && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 accent-brand-600"
              />
              <span className="text-sm text-gray-700">
                Perfil activo (los clientes pueden contactarme)
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-1 pl-6">
              Si lo desactivás dejás de aparecer en el marketplace pero tu perfil no se borra.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Guardando...' : isNew ? 'Crear mi perfil' : 'Guardar cambios'}
          </button>
          {!isNew && (
            <Link href="/services" className="btn-secondary">
              Ver marketplace
            </Link>
          )}
        </div>
      </form>

      <div className="card bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">¿Cómo funciona?</h3>
        <ol className="space-y-1.5 text-sm text-gray-600 list-decimal pl-5">
          <li>Te registrás con tu rubro y zonas donde trabajás.</li>
          <li>Cuando un cliente busca tu rubro en su ciudad, aparecés en los resultados.</li>
          <li>Te solicita presupuesto desde la app — recibís el chat con la dirección y descripción.</li>
          <li>Cotizás, el cliente acepta, hacés el trabajo, marcás como completado.</li>
          <li>El cliente paga por la app y te deja una reseña.</li>
        </ol>
      </div>
    </div>
  );
}
