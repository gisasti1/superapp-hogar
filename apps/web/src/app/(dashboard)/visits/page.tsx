'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ─── helpers ──────────────────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  PROPOSED:         'Esperando respuesta',
  COUNTER_PROPOSED: 'Contraoferta — esperando respuesta',
  CONFIRMED:        '✓ Confirmada',
  REJECTED:         'Rechazada',
  CANCELLED:        'Cancelada',
  COMPLETED:        'Realizada',
};
const STATUS_COLOR: Record<string, string> = {
  PROPOSED:         'bg-amber-100 text-amber-700',
  COUNTER_PROPOSED: 'bg-violet-100 text-violet-700',
  CONFIRMED:        'bg-emerald-100 text-emerald-700',
  REJECTED:         'bg-red-100 text-red-600',
  CANCELLED:        'bg-gray-100 text-gray-500',
  COMPLETED:        'bg-blue-100 text-blue-700',
};

function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}
function toDatetimeLocal(d?: string | Date) {
  const dt = d ? new Date(d) : new Date();
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function VisitsPage() {
  const me = useAuthStore(s => s.user);
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn:  () => visitsApi.list(),
  });
  const [tab, setTab] = useState<'all' | 'active' | 'done'>('active');

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  const filtered = (visits as any[]).filter(v => {
    if (tab === 'active') return ['PROPOSED','COUNTER_PROPOSED','CONFIRMED'].includes(v.status);
    if (tab === 'done')   return ['REJECTED','CANCELLED','COMPLETED'].includes(v.status);
    return true;
  });

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Agenda</p>
        <h1 className="text-2xl font-extrabold">Visitas a propiedades</h1>
        <p className="mt-1 text-sm opacity-90 max-w-md">
          Pediste o te pidieron visitas. Confirmá la fecha propuesta o contraofertá otro horario.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['active','done','all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
              tab === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
            }`}
          >
            {t === 'active' ? 'Activas' : t === 'done' ? 'Finalizadas' : 'Todas'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
          <p className="text-4xl mb-2">📅</p>
          <p className="text-sm">No tenés visitas {tab === 'active' ? 'activas' : tab === 'done' ? 'finalizadas' : ''} por ahora.</p>
          <p className="text-xs mt-1">Las podés pedir desde el detalle de cada propiedad.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((v: any) => (
            <VisitCard key={v.id} visit={v} meId={me?.id ?? ''} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Card por visita ─────────────────────────────────────────────────── */
function VisitCard({ visit, meId }: { visit: any; meId: string }) {
  const qc = useQueryClient();
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterDate, setCounterDate] = useState(toDatetimeLocal(visit.proposedDate));
  const [counterMessage, setCounterMessage] = useState('');

  const isMyTurn =
    ['PROPOSED','COUNTER_PROPOSED'].includes(visit.status) && visit.proposedBy !== meId;
  const iAmVisitor = visit.visitorId === meId;
  const otherSide  = iAmVisitor ? visit.owner : visit.visitor;

  const mut = useMutation({
    mutationFn: async (action: 'confirm' | 'counter' | 'reject' | 'cancel') => {
      if (action === 'confirm') return visitsApi.confirm(visit.id);
      if (action === 'reject')  return visitsApi.reject(visit.id);
      if (action === 'cancel')  return visitsApi.cancel(visit.id);
      return visitsApi.counter(visit.id, {
        proposedDate: new Date(counterDate).toISOString(),
        message:      counterMessage,
      });
    },
    onSuccess: () => {
      setCounterOpen(false);
      qc.invalidateQueries({ queryKey: ['visits'] });
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  return (
    <li className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 flex items-start gap-4 flex-wrap">
        <div className="text-3xl shrink-0">{iAmVisitor ? '👀' : '🏠'}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_COLOR[visit.status]}`}>
              {STATUS_LABELS[visit.status] ?? visit.status}
            </span>
            <span className="text-[11px] text-gray-400">
              {iAmVisitor ? 'Vos pediste' : 'Te pidieron'} · {otherSide?.firstName} {otherSide?.lastName}
            </span>
          </div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">
            {visit.property?.address}{visit.property?.city ? `, ${visit.property.city}` : ''}
          </p>
          <p className="text-sm text-indigo-700 font-medium mt-1">
            📅 {fmtDateTime(visit.proposedDate)}
            {visit.rounds > 1 && <span className="ml-2 text-xs text-gray-400">(ronda {visit.rounds})</span>}
          </p>
          {visit.message && (
            <p className="text-xs text-gray-500 italic mt-1 line-clamp-2">"{visit.message}"</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {isMyTurn && (
              <>
                <button
                  onClick={() => mut.mutate('confirm')}
                  disabled={mut.isPending}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg"
                >
                  ✓ Confirmar esta fecha
                </button>
                <button
                  onClick={() => setCounterOpen(o => !o)}
                  className="text-xs font-semibold border border-violet-300 text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-lg"
                >
                  ↻ Proponer otra
                </button>
                <button
                  onClick={() => { if (confirm('¿Rechazar esta visita?')) mut.mutate('reject'); }}
                  className="text-xs font-medium text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  ✕ Rechazar
                </button>
              </>
            )}
            {!isMyTurn && ['PROPOSED','COUNTER_PROPOSED'].includes(visit.status) && (
              <span className="text-xs text-gray-500 italic">⏳ Esperando respuesta del otro lado</span>
            )}
            {['PROPOSED','COUNTER_PROPOSED','CONFIRMED'].includes(visit.status) && (
              <button
                onClick={() => { if (confirm('¿Cancelar esta visita?')) mut.mutate('cancel'); }}
                className="text-xs font-medium text-gray-400 hover:text-red-500"
              >
                Cancelar
              </button>
            )}
            <Link href={`/listings/${visit.propertyId}`} className="text-xs text-gray-500 hover:underline ml-auto">
              Ver propiedad →
            </Link>
          </div>

          {/* Form contraoferta */}
          {counterOpen && (
            <div className="mt-3 bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-violet-700">Proponer otra fecha</p>
              <input
                type="datetime-local"
                className="input"
                value={counterDate}
                min={toDatetimeLocal()}
                onChange={e => setCounterDate(e.target.value)}
              />
              <input
                className="input"
                placeholder="Mensaje opcional (ej: mejor a la tarde)"
                value={counterMessage}
                onChange={e => setCounterMessage(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setCounterOpen(false)} className="text-xs text-gray-500">Cancelar</button>
                <button
                  onClick={() => mut.mutate('counter')}
                  disabled={mut.isPending || !counterDate}
                  className="text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg"
                >
                  {mut.isPending ? '…' : 'Enviar contraoferta'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
