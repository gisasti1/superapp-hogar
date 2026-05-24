'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issuesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const imgUrl = (u: string) => !u ? '' : u.startsWith('http') ? u : `${API_BASE}${u}`;

const STATUS_OPTIONS = [
  { id: 'OPEN', label: 'Abierto', desc: 'Recién reportado, sin acción' },
  { id: 'ACKNOWLEDGED', label: 'Recibido', desc: 'Lo vi, voy a evaluar' },
  { id: 'IN_PROGRESS', label: 'En curso', desc: 'Ya está siendo solucionado' },
  { id: 'RESOLVED', label: 'Resuelto', desc: 'Trabajo terminado, esperando confirmación' },
  { id: 'CLOSED', label: 'Cerrado', desc: 'Confirmado y cerrado' },
];

const STATUS_BADGES: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [resolutionNote, setResolutionNote] = useState('');

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => issuesApi.get(id),
  });

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: (status: string) => issuesApi.updateStatus(id, { status, resolutionNote: resolutionNote || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue', id] });
      qc.invalidateQueries({ queryKey: ['issues'] });
      setResolutionNote('');
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!issue) return <p className="text-gray-500">Reporte no encontrado.</p>;

  const isOwner = issue.property?.ownerId === user?.id;
  const isReporter = issue.reportedById === user?.id;
  const canManage = isOwner || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/issues" className="text-sm text-gray-500 hover:text-gray-700">← Volver</Link>
        <div className="flex items-start justify-between gap-3 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{issue.title}</h1>
          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_BADGES[issue.status]}`}>
            {STATUS_OPTIONS.find(s => s.id === issue.status)?.label ?? issue.status}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {issue.property.address}, {issue.property.city}
        </p>
      </div>

      <div className="card space-y-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Descripción</p>
          <p className="text-gray-700 whitespace-pre-wrap">{issue.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Categoría</p>
            <p className="text-gray-700 mt-0.5">{issue.category}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Prioridad</p>
            <p className={`mt-0.5 font-medium ${
              issue.priority === 'URGENT' ? 'text-red-600'
                : issue.priority === 'HIGH' ? 'text-orange-600'
                : 'text-gray-700'
            }`}>{issue.priority}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Reportado por</p>
            <p className="text-gray-700 mt-0.5">{issue.reportedBy.firstName} {issue.reportedBy.lastName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Fecha</p>
            <p className="text-gray-700 mt-0.5">{new Date(issue.createdAt).toLocaleString('es-AR')}</p>
          </div>
        </div>

        {issue.photos?.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Fotos</p>
            <div className="flex gap-2 flex-wrap">
              {issue.photos.map((url: string, i: number) => (
                <a key={i} href={imgUrl(url)} target="_blank" rel="noopener">
                  <img src={imgUrl(url)} alt={`Foto ${i+1}`} className="h-24 w-24 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {issue.resolutionNote && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-700 uppercase tracking-wide font-semibold mb-1">Resolución</p>
            <p className="text-sm text-green-900">{issue.resolutionNote}</p>
            {issue.resolvedAt && (
              <p className="text-xs text-green-600 mt-1">
                {new Date(issue.resolvedAt).toLocaleString('es-AR')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Acciones según el rol */}
      {(canManage || isReporter) && (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-3">Actualizar estado</h2>
          {canManage && (
            <textarea
              className="input min-h-[60px] mb-3 text-sm"
              placeholder="Nota de resolución (opcional)..."
              value={resolutionNote}
              onChange={e => setResolutionNote(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.filter(s => {
              if (canManage) return true;
              // Reporter sólo puede CLOSED u OPEN
              return ['OPEN', 'CLOSED'].includes(s.id);
            }).filter(s => s.id !== issue.status).map(s => (
              <button
                key={s.id}
                onClick={() => updateStatus(s.id)}
                disabled={isPending}
                className="btn-secondary text-sm"
                title={s.desc}
              >
                → {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
