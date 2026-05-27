'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { issuesApi } from '@/lib/api';

const CATEGORIES = [
  { id: 'PLUMBING', label: '🚰 Plomería' },
  { id: 'ELECTRICAL', label: '⚡ Eléctrica' },
  { id: 'APPLIANCES', label: '🔌 Electrodomésticos' },
  { id: 'STRUCTURAL', label: '🧱 Estructura' },
  { id: 'PEST', label: '🪳 Plagas' },
  { id: 'HEATING_COOLING', label: '❄️ Aire / calefacción' },
  { id: 'COMMON_AREAS', label: '🏛️ Espacios comunes' },
  { id: 'OTHER', label: '🛠 Otro' },
];

const PRIORITIES = [
  { id: 'LOW', label: 'Baja', desc: 'No urgente' },
  { id: 'MEDIUM', label: 'Media', desc: 'Esta semana' },
  { id: 'HIGH', label: 'Alta', desc: 'En 24-48h' },
  { id: 'URGENT', label: 'Urgente', desc: 'Hay riesgo / corte de servicio' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const imgUrl = (u: string) =>
  !u ? '' : u.startsWith('http') ? u : `${API_BASE}${u}`;

const SuspenseAny = React.Suspense as any;

export default function NewIssuePage() {
  return (
    <SuspenseAny fallback={<div className="card text-center text-gray-400">Cargando...</div>}>
      <NewIssueForm />
    </SuspenseAny>
  );
}

function NewIssueForm() {
  const router = useRouter();
  const params = useSearchParams();
  const propertyId = params.get('propertyId') ?? '';
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'PLUMBING',
    priority: 'MEDIUM',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { mutate: uploadPhotos, isPending: isUploading } = useMutation({
    mutationFn: (files: File[]) => issuesApi.uploadPhotos(files),
    onSuccess: (data: { urls: string[] }) => {
      setPhotos(prev => [...prev, ...data.urls]);
      if (fileInput.current) fileInput.current.value = '';
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Error subiendo fotos'),
  });

  const { mutate: create, isPending } = useMutation({
    mutationFn: () =>
      issuesApi.create(propertyId, {
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        photos,
      }),
    onSuccess: () => router.push('/issues'),
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'No se pudo crear el reporte'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!propertyId) {
      setError('Falta el propertyId — andá al detalle del inmueble y tocá "Reportar desperfecto".');
      return;
    }
    create();
  };

  if (!propertyId) {
    return (
      <div className="card text-center py-12 space-y-3">
        <div className="text-4xl">⚠️</div>
        <p className="text-gray-700">Falta seleccionar un inmueble.</p>
        <Link href="/listings" className="btn-primary inline-block">Ver inmuebles</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/issues" className="text-sm text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Reportar desperfecto</h1>
        <p className="text-gray-500 mt-1 text-sm">El propietario va a ser notificado y va a poder seguir el estado.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <div>
          <label className="label">Título *</label>
          <input
            className="input"
            placeholder="Ej: Pérdida de agua en el baño"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            minLength={5}
            maxLength={120}
          />
        </div>

        <div>
          <label className="label">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: c.id }))}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  form.category === c.id
                    ? 'bg-habitta-terra text-white border-habitta-terra'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-habitta-terra'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Prioridad</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRIORITIES.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, priority: p.id }))}
                className={`text-left p-2 rounded-lg border transition-colors ${
                  form.priority === p.id
                    ? 'border-habitta-terra bg-habitta-sand'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`text-sm font-medium ${
                  p.id === 'URGENT' ? 'text-red-600'
                    : p.id === 'HIGH' ? 'text-orange-600'
                    : 'text-gray-900'
                }`}>{p.label}</p>
                <p className="text-[11px] text-gray-500">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Descripción *</label>
          <textarea
            className="input min-h-[120px]"
            placeholder="Contá qué pasa, desde cuándo, qué intentaste..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
            minLength={10}
            maxLength={2000}
          />
        </div>

        <div>
          <label className="label">Fotos (opcional, hasta 5)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {photos.map((url, i) => (
              <div key={i} className="relative">
                <img src={imgUrl(url)} alt="" className="h-20 w-20 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={e => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) uploadPhotos(files);
            }}
            className="hidden"
            id="upload-issue-photos"
          />
          <label
            htmlFor="upload-issue-photos"
            className={`btn-secondary inline-flex items-center gap-2 cursor-pointer text-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            📷 {isUploading ? 'Subiendo...' : photos.length === 0 ? 'Agregar fotos' : 'Agregar más'}
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Enviando...' : 'Reportar'}
          </button>
          <Link href="/issues" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
