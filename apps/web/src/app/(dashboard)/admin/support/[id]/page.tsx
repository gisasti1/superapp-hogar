'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSupportApi } from '@/lib/api';
import { SUPPORT_TOPIC_BY_ID, SUPPORT_SUBTOPIC_LABEL, STATUS_LABEL, PRIORITY_LABEL } from '@/lib/supportTopics';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminSupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['admin-ticket', id],
    queryFn:  () => adminSupportApi.get(id),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (ticket?.internalNote) setInternalNote(ticket.internalNote);
  }, [ticket]);

  const reply = useMutation({
    mutationFn: () => adminSupportApi.reply(id, draft),
    onSuccess: () => { setDraft(''); qc.invalidateQueries({ queryKey: ['admin-ticket', id] }); },
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });
  const update = useMutation({
    mutationFn: (dto: any) => adminSupportApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ticket', id] }),
  });

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  if (!ticket) return <p className="text-habitta-stone">Ticket no encontrado.</p>;

  const cat    = SUPPORT_TOPIC_BY_ID[ticket.category];
  const status = STATUS_LABEL[ticket.status] ?? STATUS_LABEL.OPEN;
  const prio   = PRIORITY_LABEL[ticket.priority] ?? PRIORITY_LABEL.NORMAL;
  const subLbl = ticket.subCategory ? SUPPORT_SUBTOPIC_LABEL[`${ticket.category}:${ticket.subCategory}`] : null;

  return (
    <div className="space-y-4">
      <Link href="/admin/support" className="text-sm text-habitta-charcoal hover:text-habitta-terra transition">
        ← Volver a tickets
      </Link>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
        {/* Columna izquierda: hilo */}
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white border border-habitta-sand rounded-2xl p-5 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{cat?.icon}</span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-habitta-stone">{cat?.label}</p>
                  <h1 className="text-lg font-extrabold text-habitta-deep">{ticket.subject}</h1>
                  {subLbl && <p className="text-xs text-habitta-charcoal/70 mt-0.5">{subLbl}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-center ${status.color}`}>
                  {status.label}
                </span>
                <span className={`text-[10px] font-bold uppercase text-center ${prio.color}`}>
                  Prioridad: {prio.label}
                </span>
              </div>
            </div>
          </div>

          {/* Hilo */}
          <div className="bg-white border border-habitta-sand rounded-2xl p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {ticket.messages.map((m: any) => {
              const isAdmin = m.authorRole === 'ADMIN';
              return (
                <div key={m.id} className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                  <div className="shrink-0 w-9 h-9 rounded-full bg-habitta-sand flex items-center justify-center text-base">
                    {isAdmin ? '🛠' : (m.author?.firstName?.[0] ?? '?')}
                  </div>
                  <div className={`max-w-[80%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`rounded-2xl px-4 py-2 ${
                      isAdmin
                        ? 'bg-habitta-terra text-habitta-cream'
                        : 'bg-habitta-sand text-habitta-deep'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    </div>
                    <p className="text-[10px] text-habitta-stone mt-1">
                      {isAdmin
                        ? `Vos (admin) · ${new Date(m.createdAt).toLocaleString('es-AR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}`
                        : `${m.author?.firstName ?? ''} ${m.author?.lastName ?? ''} · ${new Date(m.createdAt).toLocaleString('es-AR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}`
                      }
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Form respuesta */}
          <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) reply.mutate(); }} className="bg-white border border-habitta-sand rounded-2xl p-3 flex items-end gap-2">
            <textarea
              className="input flex-1 min-h-[80px]"
              placeholder="Tu respuesta al usuario…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            <button type="submit" disabled={!draft.trim() || reply.isPending} className="btn-primary">
              {reply.isPending ? '…' : 'Responder'}
            </button>
          </form>
        </div>

        {/* Columna derecha: panel admin */}
        <div className="space-y-3">
          {/* Usuario */}
          <div className="bg-white border border-habitta-sand rounded-2xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-habitta-stone font-bold">Usuario</p>
            <p className="font-bold text-habitta-deep text-sm">{ticket.user.firstName} {ticket.user.lastName}</p>
            <p className="text-xs text-habitta-stone">{ticket.user.email}</p>
            <p className="text-xs text-habitta-stone">Cuenta: {ticket.user.role}</p>
            <p className="text-[10px] text-habitta-stone">Creada {new Date(ticket.user.createdAt).toLocaleDateString('es-AR')}</p>
          </div>

          {/* Acciones */}
          <div className="bg-white border border-habitta-sand rounded-2xl p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-habitta-stone font-bold">Cambiar estado</p>
            <div className="grid grid-cols-2 gap-2">
              {(['IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => update.mutate({ status: s })}
                  disabled={ticket.status === s}
                  className={`text-xs px-2 py-2 rounded-lg font-semibold transition ${
                    ticket.status === s
                      ? 'bg-habitta-terra text-habitta-cream'
                      : 'bg-habitta-sand text-habitta-deep hover:bg-habitta-beige/60'
                  }`}
                >
                  {STATUS_LABEL[s].label}
                </button>
              ))}
            </div>

            <p className="text-[10px] uppercase tracking-wider text-habitta-stone font-bold mt-3">Prioridad</p>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW','NORMAL','HIGH','URGENT'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => update.mutate({ priority: p })}
                  className={`text-[10px] py-1.5 rounded-lg font-bold uppercase transition ${
                    ticket.priority === p
                      ? 'bg-habitta-deep text-habitta-cream'
                      : 'bg-habitta-sand text-habitta-charcoal hover:bg-habitta-beige/60'
                  }`}
                >
                  {PRIORITY_LABEL[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Nota interna */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">📝 Nota interna (no la ve el user)</p>
            <textarea
              className="input bg-white min-h-[80px] text-xs"
              value={internalNote}
              onChange={e => setInternalNote(e.target.value)}
              placeholder="Datos para vos y el resto del equipo…"
            />
            <button
              onClick={() => update.mutate({ internalNote })}
              disabled={update.isPending}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900"
            >
              💾 Guardar nota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
