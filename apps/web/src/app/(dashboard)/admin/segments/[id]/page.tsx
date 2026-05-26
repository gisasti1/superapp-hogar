'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingApi } from '@/lib/api';
import { SegmentFilterBuilder, SegmentFilters } from '@/components/admin/SegmentFilterBuilder';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function EditSegmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: segment, isLoading } = useQuery({
    queryKey: ['segment', id],
    queryFn: () => marketingApi.getSegment(id),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filters, setFilters] = useState<SegmentFilters>({});
  const [tab, setTab] = useState<'filters' | 'users'>('filters');
  const [usersPage, setUsersPage] = useState(1);

  // Prellenar cuando carga
  useEffect(() => {
    if (segment) {
      setName(segment.name ?? '');
      setDescription(segment.description ?? '');
      setFilters(segment.filters ?? {});
    }
  }, [segment]);

  const { mutate: save, isPending: saving, error } = useMutation({
    mutationFn: () => marketingApi.updateSegment(id, {
      name: name.trim(),
      description: description.trim() || undefined,
      filters,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['segment', id] });
      qc.invalidateQueries({ queryKey: ['admin-segments'] });
    },
  });

  const { mutate: deleteSegment } = useMutation({
    mutationFn: () => marketingApi.deleteSegment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-segments'] });
      router.push('/admin/segments');
    },
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al eliminar'),
  });

  // Lista de usuarios del segmento (lazy: solo cuando abre la tab)
  const { data: usersData, isFetching: loadingUsers } = useQuery({
    queryKey: ['segment-users', id, usersPage],
    queryFn: () => marketingApi.listSegmentUsers(id, usersPage),
    enabled: tab === 'users',
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }
  if (!segment) return <p className="text-gray-500">Segmento no encontrado.</p>;

  const errMsg = (error as any)?.response?.data?.message;
  const errStr = Array.isArray(errMsg) ? errMsg.join(' · ') : errMsg;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/admin/segments" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a segmentos
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">{segment.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {(segment.lastCount ?? 0).toLocaleString('es-AR')} usuarios coinciden con los filtros actuales
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab('filters')}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
            tab === 'filters' ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          ⚙️ Filtros
        </button>
        <button
          onClick={() => setTab('users')}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
            tab === 'users' ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          👥 Ver usuarios
        </button>
      </div>

      {tab === 'filters' ? (
        <>
          {errStr && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {errStr}
            </div>
          )}

          <div className="card space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                required maxLength={120}
              />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea
                className="input min-h-[60px]"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          <SegmentFilterBuilder initial={segment.filters} onChange={setFilters} />

          <div className="flex items-center justify-between gap-3 pt-2 pb-6 flex-wrap">
            <div className="flex gap-3">
              <button
                onClick={() => save()}
                disabled={saving || !name.trim()}
                className="btn-primary"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <Link href="/admin/segments" className="btn-secondary">Cancelar</Link>
            </div>
            <button
              onClick={() => {
                if (segment._count?.campaigns > 0 || segment.campaigns?.length > 0) {
                  alert('Este segmento tiene campañas asociadas. Borrá las campañas primero.');
                  return;
                }
                if (confirm(`¿Eliminar segmento "${segment.name}"?`)) deleteSegment();
              }}
              className="text-sm text-red-600 hover:underline"
            >
              🗑 Eliminar segmento
            </button>
          </div>
        </>
      ) : (
        <UsersTab data={usersData} loading={loadingUsers} page={usersPage} setPage={setUsersPage} />
      )}
    </div>
  );
}

// ─── Tab de usuarios ──────────────────────────────────────────────────────

function UsersTab({
  data, loading, page, setPage,
}: { data: any; loading: boolean; page: number; setPage: (n: number) => void }) {
  if (loading && !data) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  if (!data?.users?.length) {
    return (
      <div className="card text-center text-gray-500 py-12">
        Ningún usuario coincide con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Ciudad</th>
              <th className="px-3 py-2">Ocupación</th>
              <th className="px-3 py-2 text-center">Email</th>
              <th className="px-3 py-2 text-center">SMS</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u: any) => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-3 py-2 text-gray-600">{u.email}</td>
                <td className="px-3 py-2 text-gray-600">{u.city ?? '—'}</td>
                <td className="px-3 py-2 text-gray-600">{u.occupation ?? '—'}</td>
                <td className="px-3 py-2 text-center">
                  {u.marketingEmailConsent ? '✅' : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {u.marketingSmsConsent ? '✅' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Mostrando {data.users.length} de {data.total.toLocaleString('es-AR')} usuarios
          {' · '} página {data.page} de {data.pages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= data.pages || loading}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
