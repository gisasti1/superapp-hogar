'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { SUPPORT_TOPIC_BY_ID, SUPPORT_SUBTOPIC_LABEL, STATUS_LABEL } from '@/lib/supportTopics';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function SupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const me = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support-ticket', id],
    queryFn:  () => supportApi.get(id),
  });

  const reply = useMutation({
    mutationFn: () => supportApi.reply(id, draft),
    onSuccess: () => { setDraft(''); qc.invalidateQueries({ queryKey: ['support-ticket', id] }); },
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket]);

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  if (!ticket) return <p className="text-habitta-stone">Ticket no encontrado.</p>;

  const cat    = SUPPORT_TOPIC_BY_ID[ticket.category];
  const status = STATUS_LABEL[ticket.status] ?? STATUS_LABEL.OPEN;
  const subLbl = ticket.subCategory ? SUPPORT_SUBTOPIC_LABEL[`${ticket.category}:${ticket.subCategory}`] : null;
  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link href="/support" className="text-sm text-habitta-charcoal hover:text-habitta-terra transition">
        ← Volver a mis consultas
      </Link>

      {/* Header */}
      <div className="bg-habitta-cream rounded-2xl border border-habitta-sand p-5 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cat?.icon ?? '✉️'}</span>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-habitta-stone">{cat?.label}</p>
              <h1 className="text-lg font-extrabold text-habitta-deep leading-tight">{ticket.subject}</h1>
              {subLbl && <p className="text-xs text-habitta-charcoal/70 mt-0.5">{subLbl}</p>}
            </div>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Hilo de mensajes */}
      <div className="bg-white rounded-2xl border border-habitta-sand p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        {ticket.messages.map((m: any) => {
          const isMine = m.authorId === me?.id;
          const isAdmin = m.authorRole === 'ADMIN';
          return (
            <div key={m.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
              <div className="shrink-0 w-9 h-9 rounded-full bg-habitta-sand flex items-center justify-center text-base">
                {isAdmin ? '🛠' : (m.author?.firstName?.[0] ?? '?')}
              </div>
              <div className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-2 ${
                  isAdmin
                    ? 'bg-habitta-eucalyptus/15 border border-habitta-eucalyptus/30 text-habitta-deep'
                    : isMine
                      ? 'bg-habitta-terra text-habitta-cream'
                      : 'bg-habitta-sand text-habitta-deep'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                </div>
                <p className="text-[10px] text-habitta-stone mt-1">
                  {isAdmin
                    ? `Soporte · ${new Date(m.createdAt).toLocaleString('es-AR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}`
                    : `${m.author?.firstName ?? ''} · ${new Date(m.createdAt).toLocaleString('es-AR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}`
                  }
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Form de respuesta */}
      {isClosed ? (
        <div className="bg-habitta-sand/60 border border-habitta-stone/30 rounded-xl p-4 text-sm text-habitta-charcoal text-center">
          Este ticket está cerrado. Si necesitás continuar, abrí una consulta nueva.
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) reply.mutate(); }} className="bg-habitta-cream rounded-2xl border border-habitta-sand p-3 flex items-end gap-2">
          <textarea
            className="input flex-1 min-h-[60px]"
            placeholder="Escribí tu respuesta…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={4000}
          />
          <button
            type="submit"
            disabled={!draft.trim() || reply.isPending}
            className="btn-primary"
          >
            {reply.isPending ? '…' : 'Enviar'}
          </button>
        </form>
      )}
    </div>
  );
}
