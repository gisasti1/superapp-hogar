'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminSupportApi } from '@/lib/api';
import { SUPPORT_TOPIC_BY_ID, SUPPORT_TOPICS, STATUS_LABEL, PRIORITY_LABEL } from '@/lib/supportTopics';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminSupportPage() {
  const [filters, setFilters] = useState({ status: 'ALL', category: 'ALL', priority: 'ALL', search: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['admin-support', filters],
    queryFn:  () => adminSupportApi.list(filters),
  });

  const tickets = data?.tickets ?? [];
  const counts  = data?.counts ?? { open: 0, inProgress: 0, waitingUser: 0, resolved: 0, urgent: 0 };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Abiertos" value={counts.open} color="bg-habitta-beige/60 text-habitta-deep" />
        <Stat label="En curso" value={counts.inProgress} color="bg-habitta-eucalyptus/30 text-habitta-eucalyptus" />
        <Stat label="Esperan al user" value={counts.waitingUser} color="bg-amber-100 text-amber-700" />
        <Stat label="Resueltos" value={counts.resolved} color="bg-emerald-100 text-emerald-700" />
        <Stat label="🔥 Urgentes" value={counts.urgent} color="bg-red-100 text-red-600" />
      </div>

      {/* Filtros */}
      <div className="bg-white border border-habitta-sand rounded-2xl p-4 grid sm:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="Buscar por asunto, usuario, email…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select className="input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="ALL">Estado: todos</option>
          <option value="OPEN">Abiertos</option>
          <option value="IN_PROGRESS">En curso</option>
          <option value="WAITING_USER">Esperando user</option>
          <option value="RESOLVED">Resueltos</option>
          <option value="CLOSED">Cerrados</option>
        </select>
        <select className="input" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
          <option value="ALL">Categoría: todas</option>
          {SUPPORT_TOPICS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <select className="input" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="ALL">Prioridad: todas</option>
          <option value="URGENT">Urgente</option>
          <option value="HIGH">Alta</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Baja</option>
        </select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-habitta-olive/30 p-12 text-center text-habitta-stone">
          <p className="text-4xl mb-2">📭</p>
          <p>No hay tickets con esos filtros.</p>
        </div>
      ) : (
        <div className="bg-white border border-habitta-sand rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-habitta-sand/40 text-[11px] uppercase text-habitta-stone tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Ticket</th>
                <th className="text-left px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3 text-right">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-habitta-sand">
              {tickets.map((t: any) => {
                const cat = SUPPORT_TOPIC_BY_ID[t.category];
                const st  = STATUS_LABEL[t.status] ?? STATUS_LABEL.OPEN;
                const pr  = PRIORITY_LABEL[t.priority] ?? PRIORITY_LABEL.NORMAL;
                return (
                  <tr key={t.id} className="hover:bg-habitta-cream/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/support/${t.id}`} className="block">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{cat?.icon}</span>
                          <span className="text-[10px] text-habitta-stone uppercase tracking-wider">{cat?.label}</span>
                        </div>
                        <p className="font-semibold text-habitta-deep">{t.subject}</p>
                        <p className="text-[11px] text-habitta-stone">💬 {t._count?.messages ?? 0} mensajes</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-medium text-habitta-deep">{t.user.firstName} {t.user.lastName}</p>
                      <p className="text-habitta-stone">{t.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </td>
                    <td className={`px-4 py-3 text-center text-xs font-bold ${pr.color}`}>{pr.label}</td>
                    <td className="px-4 py-3 text-right text-[11px] text-habitta-stone">
                      {new Date(t.updatedAt).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-habitta-sand rounded-2xl p-4 text-center">
      <p className={`inline-flex items-center justify-center text-xl font-extrabold w-12 h-12 rounded-full ${color}`}>{value}</p>
      <p className="text-[11px] text-habitta-stone uppercase tracking-wider mt-2">{label}</p>
    </div>
  );
}
