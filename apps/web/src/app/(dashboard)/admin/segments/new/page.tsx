'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { marketingApi } from '@/lib/api';
import { SegmentFilterBuilder, SegmentFilters } from '@/components/admin/SegmentFilterBuilder';

export default function NewSegmentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filters, setFilters] = useState<SegmentFilters>({});

  const { mutate: create, isPending, error } = useMutation({
    mutationFn: () => marketingApi.createSegment({
      name: name.trim(),
      description: description.trim() || undefined,
      filters,
    }),
    onSuccess: (segment: any) => {
      router.push(`/admin/segments/${segment.id}`);
    },
  });

  const errMsg = (error as any)?.response?.data?.message;
  const errStr = Array.isArray(errMsg) ? errMsg.join(' · ') : errMsg;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/admin/segments" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a segmentos
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">Nuevo segmento</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configurá los filtros — el contador de la izquierda te muestra cuántos usuarios
          coinciden en tiempo real.
        </p>
      </div>

      {errStr && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {errStr}
        </div>
      )}

      <div className="card space-y-4">
        <div>
          <label className="label">Nombre del segmento *</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Inquilinos de CABA con email opt-in"
            required maxLength={120}
          />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea
            className="input min-h-[60px]"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Para qué sirve este segmento, qué campaña vas a mandar, etc."
            maxLength={500}
          />
        </div>
      </div>

      <SegmentFilterBuilder onChange={setFilters} />

      <div className="flex items-center gap-3 pt-2 pb-6">
        <button
          onClick={() => create()}
          disabled={isPending || !name.trim()}
          className="btn-primary"
        >
          {isPending ? 'Creando...' : 'Crear segmento'}
        </button>
        <Link href="/admin/segments" className="btn-secondary">Cancelar</Link>
      </div>
    </div>
  );
}
