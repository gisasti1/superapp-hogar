'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '@/lib/api';
import { SUPPORT_TOPICS, SUPPORT_TOPIC_BY_ID, STATUS_LABEL } from '@/lib/supportTopics';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function SupportPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-mine'],
    queryFn:  () => supportApi.listMine(),
  });

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-habitta-deep via-habitta-earth to-habitta-terra rounded-2xl p-6 text-habitta-cream shadow-lg">
        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Ayuda</p>
        <h1 className="text-2xl font-extrabold">Centro de soporte</h1>
        <p className="mt-1 text-sm opacity-90 max-w-md">
          Contanos qué te pasa o qué necesitás — nuestro equipo te responde por acá.
          Elegí una categoría y describí tu caso.
        </p>
      </div>

      {/* Botón nuevo ticket */}
      {!creating && (
        <div className="flex justify-end">
          <button onClick={() => setCreating(true)} className="btn-primary">
            + Nueva consulta
          </button>
        </div>
      )}

      {creating && (
        <NewTicketForm
          onCancel={() => setCreating(false)}
          onCreated={(id) => {
            qc.invalidateQueries({ queryKey: ['support-mine'] });
            router.push(`/support/${id}`);
          }}
        />
      )}

      {/* Lista de tickets */}
      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : (tickets as any[]).length === 0 ? (
        <div className="bg-habitta-cream border-2 border-dashed border-habitta-olive/30 rounded-2xl p-10 text-center text-habitta-stone">
          <p className="text-4xl mb-2">✉️</p>
          <p className="text-sm">No abriste ninguna consulta todavía.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(tickets as any[]).map((t: any) => {
            const cat    = SUPPORT_TOPIC_BY_ID[t.category];
            const status = STATUS_LABEL[t.status] ?? STATUS_LABEL.OPEN;
            const lastMsg = t.messages?.[0];
            return (
              <Link
                key={t.id}
                href={`/support/${t.id}`}
                className="block bg-habitta-cream rounded-2xl border border-habitta-sand p-4 hover:border-habitta-terra/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{cat?.icon ?? '✉️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] text-habitta-stone">
                        {cat?.label ?? t.category}
                      </span>
                    </div>
                    <p className="font-bold text-habitta-deep text-sm leading-tight">{t.subject}</p>
                    {lastMsg && (
                      <p className="text-xs text-habitta-charcoal/70 mt-1 line-clamp-2">
                        <span className="font-medium">
                          {lastMsg.authorRole === 'ADMIN' ? '🛠 Soporte: ' : 'Vos: '}
                        </span>
                        {lastMsg.body}
                      </p>
                    )}
                    <p className="text-[10px] text-habitta-stone mt-1">
                      Actualizado {new Date(t.updatedAt).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── Formulario nuevo ticket ─────────────────────────────────────────── */
function NewTicketForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [category, setCategory]       = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [subject, setSubject]         = useState('');
  const [body, setBody]               = useState('');

  const topic = SUPPORT_TOPIC_BY_ID[category];

  const create = useMutation({
    mutationFn: () => supportApi.create({ category, subCategory: subCategory || undefined, subject, body }),
    onSuccess: (t: any) => onCreated(t.id),
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error al crear la consulta'),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
      className="bg-habitta-cream border border-habitta-sand rounded-2xl p-5 space-y-4 shadow-sm"
    >
      <h2 className="font-bold text-habitta-deep text-lg">📩 Nueva consulta a la admin</h2>

      {/* Categoría */}
      <div>
        <label className="label">¿Sobre qué es? *</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
          {SUPPORT_TOPICS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setCategory(t.id); setSubCategory(''); }}
              className={`p-3 rounded-xl border text-left transition ${
                category === t.id
                  ? 'bg-habitta-terra text-habitta-cream border-habitta-terra shadow-sm'
                  : 'bg-white border-habitta-olive/40 text-habitta-deep hover:border-habitta-terra hover:bg-habitta-sand'
              }`}
            >
              <div className="text-xl mb-1">{t.icon}</div>
              <p className="text-xs font-bold leading-tight">{t.label}</p>
            </button>
          ))}
        </div>
        {topic && (
          <p className="text-xs text-habitta-stone mt-2 italic">{topic.description}</p>
        )}
      </div>

      {/* Subcategoría */}
      {topic && (
        <div>
          <label className="label">¿Algo más específico?</label>
          <select
            className="input"
            value={subCategory}
            onChange={e => setSubCategory(e.target.value)}
          >
            <option value="">— Elegí un sub-tema (opcional) —</option>
            {topic.subTopics.map(st => (
              <option key={st.id} value={st.id}>{st.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Asunto */}
      <div>
        <label className="label">Asunto *</label>
        <input
          className="input"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxLength={120}
          placeholder="Ej: No me llega el comprobante de mayo"
          required
        />
      </div>

      {/* Body */}
      <div>
        <label className="label">Contanos en detalle *</label>
        <textarea
          className="input min-h-[140px]"
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={4000}
          placeholder="Describí lo que te pasa, qué intentaste, capturas si tenés (próximamente)…"
          required
        />
        <p className="text-xs text-habitta-stone mt-1">{body.length} / 4000</p>
      </div>

      <div className="flex justify-end gap-2 border-t border-habitta-sand pt-3">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
        <button
          type="submit"
          disabled={!category || !subject || body.length < 10 || create.isPending}
          className="btn-primary text-sm"
        >
          {create.isPending ? 'Enviando…' : 'Enviar consulta'}
        </button>
      </div>
    </form>
  );
}
