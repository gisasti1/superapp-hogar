'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rentalRequestsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChatButton } from '@/components/ChatButton';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:         { label: 'Pendiente',          color: 'bg-amber-100 text-amber-800' },
  COUNTER_OFFERED: { label: 'Contraoferta',       color: 'bg-violet-100 text-violet-700' },
  APPROVED:        { label: 'Aprobada',           color: 'bg-green-100 text-green-700' },
  REJECTED:        { label: 'Rechazada',          color: 'bg-red-100 text-red-700' },
  CANCELLED:       { label: 'Cancelada',          color: 'bg-gray-100 text-gray-600' },
  EXPIRED:         { label: 'Vencida',            color: 'bg-gray-100 text-gray-600' },
  CONVERTED:       { label: 'Contrato firmado',   color: 'bg-blue-100 text-blue-700' },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const imgUrl = (u: string) => !u ? '' : u.startsWith('http') ? u : `${API_BASE}${u}`;

export default function RentalRequestsPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['rental-requests'],
    queryFn: rentalRequestsApi.list,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response?: string }) =>
      rentalRequestsApi.approve(id, response),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rental-requests'] }),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response?: string }) =>
      rentalRequestsApi.reject(id, response),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rental-requests'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => rentalRequestsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rental-requests'] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const isLandlord = user?.role === 'LANDLORD';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isLandlord ? 'Solicitudes recibidas' : 'Mis solicitudes de alquiler'}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {isLandlord
            ? 'Inquilinos que postularon a tus inmuebles publicados.'
            : 'Inmuebles a los que te postulaste.'}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📨"
            title={isLandlord ? 'Sin solicitudes' : 'No te postulaste a ningún inmueble'}
            description={
              isLandlord
                ? 'Cuando un inquilino postule, va a aparecer acá.'
                : 'Cuando veas un inmueble que te guste, tocá "Solicitar alquiler".'
            }
            action={
              !isLandlord ? (
                <Link href="/listings" className="btn-primary">Buscar inmuebles</Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => {
            const status = STATUS_LABELS[r.status] ?? STATUS_LABELS.PENDING;
            const counterparty = isLandlord ? r.tenant : r.landlord;
            const firstImage = r.property.images?.[0]?.url;
            return (
              <div key={r.id} className="card flex flex-col sm:flex-row gap-4">
                {firstImage ? (
                  <img
                    src={imgUrl(firstImage)}
                    alt={r.property.address}
                    className="w-full sm:w-32 h-32 sm:h-24 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-full sm:w-32 h-32 sm:h-24 bg-gradient-to-br from-brand-100 to-brand-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">🏠</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{r.property.address}</p>
                      <p className="text-xs text-gray-500">
                        {r.property.city} · ${Number(r.property.monthlyRent).toLocaleString('es-AR')} {r.property.currency}/mes
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="text-xs text-gray-400">{isLandlord ? 'Solicitante:' : 'Propietario:'}</span>{' '}
                    {counterparty.firstName} {counterparty.lastName}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString('es-AR')}</p>

                  {/* Panel de negociación: monto/duración propuestos + contraoferta activa */}
                  <NegotiationPanel request={r} meId={user?.id ?? ''} />

                  {/* Acciones */}
                  {['PENDING', 'COUNTER_OFFERED'].includes(r.status) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {isLandlord ? (
                        <>
                          <button
                            onClick={() => {
                              const resp = prompt('Mensaje al inquilino (opcional):', 'Aprobado, te paso datos por privado.');
                              approveMutation.mutate({ id: r.id, response: resp ?? undefined });
                            }}
                            disabled={approveMutation.isPending}
                            className="btn-primary text-sm"
                          >
                            ✓ Aprobar
                          </button>
                          <button
                            onClick={() => {
                              const resp = prompt('Motivo del rechazo (opcional):');
                              if (resp !== null) rejectMutation.mutate({ id: r.id, response: resp || undefined });
                            }}
                            disabled={rejectMutation.isPending}
                            className="btn-secondary text-sm"
                          >
                            ✕ Rechazar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm('¿Cancelar tu solicitud?')) cancelMutation.mutate(r.id);
                          }}
                          disabled={cancelMutation.isPending}
                          className="btn-secondary text-sm"
                        >
                          Cancelar mi solicitud
                        </button>
                      )}

                      <CounterOfferButton request={r} meId={user?.id ?? ''} />
                    </div>
                  )}

                  {/* Mensaje del usuario */}
                  {r.message && (
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700 text-xs">
                        Ver mensaje
                      </summary>
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap bg-gray-50 p-2 rounded">{r.message}</p>
                    </details>
                  )}

                  {/* Respuesta del propietario */}
                  {r.response && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                      <p className="text-blue-900 font-medium">Respuesta del propietario:</p>
                      <p className="text-blue-800 mt-0.5">{r.response}</p>
                    </div>
                  )}

                  {/* Chat (cuando la solicitud está aprobada o pendiente, ambas partes pueden hablar) */}
                  {['PENDING', 'APPROVED'].includes(r.status) && (
                    <div className="mt-2">
                      <ChatButton
                        otherUserId={isLandlord ? r.tenant.id : r.landlord.id}
                        rentalRequestId={r.id}
                        label="💬 Chatear"
                        className="text-xs text-brand-600 hover:underline"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Panel de negociación (precio / duración) ───────────────────────── */
function NegotiationPanel({ request: r, meId }: { request: any; meId: string }) {
  const hasProposal = r.proposedMonthlyAmount || r.proposedMonths || r.proposedStartDate;
  const hasCounter  = r.status === 'COUNTER_OFFERED' || r.counterAt;
  if (!hasProposal && !hasCounter) return null;

  const fmtMoney = (n: number | string | null | undefined, c = r.property?.currency ?? 'ARS') =>
    n ? `$${Number(n).toLocaleString('es-AR')} ${c}` : '—';
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('es-AR') : '—';
  const counterByMe = r.counterByUserId === meId;

  return (
    <div className="mt-3 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">💬 Negociación</span>
        {r.rounds > 0 && <span className="text-[10px] text-gray-400">Ronda {r.rounds}</span>}
        {hasCounter && (
          <span className="text-[10px] font-medium text-violet-700">
            {counterByMe ? '⏳ Esperando que el otro responda tu contraoferta' : '👉 Te hicieron una contraoferta'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Publicado</p>
          <p className="font-bold text-gray-900">{fmtMoney(r.property?.monthlyRent)}</p>
        </div>
        {hasProposal && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Propuesta inicial</p>
            <p className="font-bold text-indigo-700">{fmtMoney(r.proposedMonthlyAmount)}</p>
            {r.proposedMonths && <p className="text-[10px] text-gray-500">{r.proposedMonths} meses</p>}
            {r.proposedStartDate && <p className="text-[10px] text-gray-500">Desde {fmtDate(r.proposedStartDate)}</p>}
          </div>
        )}
        {hasCounter && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Última contraoferta</p>
            <p className="font-bold text-violet-700">{fmtMoney(r.counterAmount)}</p>
            {r.counterMonths && <p className="text-[10px] text-gray-500">{r.counterMonths} meses</p>}
            {r.counterStartDate && <p className="text-[10px] text-gray-500">Desde {fmtDate(r.counterStartDate)}</p>}
          </div>
        )}
      </div>
      {r.counterMessage && (
        <p className="text-xs text-gray-600 italic bg-white/60 p-2 rounded">"{r.counterMessage}"</p>
      )}
    </div>
  );
}

/* ─── Botón "↻ Contraproponer" ───────────────────────────────────────── */
function CounterOfferButton({ request: r, meId }: { request: any; meId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const isMyTurn = r.counterByUserId !== meId; // si yo no fui el último, puedo contraponer

  const last = {
    amount:    r.counterAmount    ?? r.proposedMonthlyAmount ?? r.property?.monthlyRent,
    months:    r.counterMonths    ?? r.proposedMonths        ?? '',
    startDate: r.counterStartDate ?? r.proposedStartDate     ?? '',
  };
  const [form, setForm] = useState({
    amount:    Number(last.amount) || 0,
    months:    String(last.months || ''),
    startDate: last.startDate ? new Date(last.startDate).toISOString().slice(0,10) : '',
    message:   '',
  });

  const mut = useMutation({
    mutationFn: () => rentalRequestsApi.counter(r.id, {
      amount:    form.amount > 0 ? Number(form.amount) : undefined,
      months:    form.months ? Number(form.months) : undefined,
      startDate: form.startDate || undefined,
      message:   form.message || undefined,
    }),
    onSuccess: () => { setOpen(false); qc.invalidateQueries({ queryKey: ['rental-requests'] }); },
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  if (!isMyTurn) {
    return <span className="text-xs text-gray-500 italic self-center">⏳ Esperá la respuesta del otro lado</span>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-semibold border border-violet-300 text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-lg">
        ↻ Contraproponer
      </button>
    );
  }

  return (
    <div className="w-full mt-2 bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
      <p className="text-xs font-bold text-violet-700">Tu contraoferta</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 uppercase">Monto mensual</label>
          <input type="number" min="0" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase">Meses</label>
          <input type="number" min="1" max="60" className="input" value={form.months} onChange={e => setForm(f => ({ ...f, months: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-gray-500 uppercase">Fecha de inicio</label>
        <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
      </div>
      <input className="input text-xs" placeholder="Mensaje (opcional)" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500">Cancelar</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg">
          {mut.isPending ? '…' : 'Enviar contraoferta'}
        </button>
      </div>
    </div>
  );
}
