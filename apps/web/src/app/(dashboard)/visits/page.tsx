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
  const [tab, setTab]   = useState<'all' | 'active' | 'done'>('active');
  const [view, setView] = useState<'list' | 'calendar'>('list');

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

      {/* Tabs + view toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
        <div className="bg-gray-100 rounded-xl p-0.5 inline-flex">
          {(['list','calendar'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {v === 'list' ? '☰ Lista' : '📆 Calendario'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
          <p className="text-4xl mb-2">📅</p>
          <p className="text-sm">No tenés visitas {tab === 'active' ? 'activas' : tab === 'done' ? 'finalizadas' : ''} por ahora.</p>
          <p className="text-xs mt-1">Las podés pedir desde el detalle de cada propiedad.</p>
        </div>
      ) : view === 'list' ? (
        <ul className="space-y-3">
          {filtered.map((v: any) => (
            <VisitCard key={v.id} visit={v} meId={me?.id ?? ''} />
          ))}
        </ul>
      ) : (
        <CalendarView visits={filtered} meId={me?.id ?? ''} />
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

/* ─── Vista calendario (mensual) ───────────────────────────────────── */
function CalendarView({ visits, meId }: { visits: any[]; meId: string }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // Agrupar visitas por día (YYYY-MM-DD)
  const byDay = new Map<string, any[]>();
  for (const v of visits) {
    const d = new Date(v.proposedDate);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(v);
  }

  const first    = new Date(month.y, month.m, 1);
  const startDow = (first.getDay() + 6) % 7; // lunes=0
  const daysIn   = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = new Date(month.y, month.m, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const today = new Date();

  const [openDay, setOpenDay] = useState<string | null>(null);
  const openDayVisits = openDay ? (byDay.get(openDay) ?? []) : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={() => setMonth(m => m.m === 0 ? { y: m.y - 1, m: 11 } : { y: m.y, m: m.m - 1 })}
          className="text-gray-500 hover:text-gray-900 text-lg w-8 h-8 rounded-lg hover:bg-gray-100">‹</button>
        <p className="font-bold text-gray-900 capitalize">{monthName}</p>
        <button onClick={() => setMonth(m => m.m === 11 ? { y: m.y + 1, m: 0 } : { y: m.y, m: m.m + 1 })}
          className="text-gray-500 hover:text-gray-900 text-lg w-8 h-8 rounded-lg hover:bg-gray-100">›</button>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="border-b border-r border-gray-100 min-h-[70px] bg-gray-50/50" />;
          const k = `${month.y}-${String(month.m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const dayVisits = byDay.get(k) ?? [];
          const isToday = today.getFullYear() === month.y && today.getMonth() === month.m && today.getDate() === d;
          return (
            <button
              key={i}
              onClick={() => dayVisits.length > 0 && setOpenDay(openDay === k ? null : k)}
              className={`border-b border-r border-gray-100 min-h-[70px] p-1.5 text-left transition-colors ${
                dayVisits.length > 0 ? 'hover:bg-indigo-50 cursor-pointer' : 'cursor-default'
              } ${openDay === k ? 'bg-indigo-50' : ''}`}
            >
              <p className={`text-xs font-bold ${isToday ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white' : 'text-gray-700'}`}>{d}</p>
              <div className="mt-1 space-y-0.5">
                {dayVisits.slice(0, 2).map(v => (
                  <p key={v.id} className={`text-[9px] truncate px-1 py-0.5 rounded ${STATUS_COLOR[v.status]}`}>
                    {new Date(v.proposedDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                ))}
                {dayVisits.length > 2 && (
                  <p className="text-[9px] text-gray-500">+{dayVisits.length - 2} más</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalle del día seleccionado */}
      {openDay && openDayVisits.length > 0 && (
        <div className="border-t border-gray-100 p-4 space-y-2 bg-gray-50/40">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Visitas del {new Date(openDay).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {openDayVisits.map(v => (
            <VisitCard key={v.id} visit={v} meId={meId} />
          ))}
        </div>
      )}
    </div>
  );
}
