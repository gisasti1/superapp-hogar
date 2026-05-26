'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingApi, campaignsApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ─── Status config ─────────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  DRAFT:     { label: 'Borrador',  dot: 'bg-amber-400',  bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-300'  },
  SENT:      { label: 'Enviada',   dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  CANCELLED: { label: 'Cancelada', dot: 'bg-gray-400',    bg: 'bg-gray-50',    text: 'text-gray-500',   border: 'border-gray-200'   },
};

/* ─── Small metric card ─────────────────────────────────────────────────── */
function Metric({ value, label, color = 'text-gray-900' }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
      <p className={`text-3xl font-extrabold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

/* ─── Section card ──────────────────────────────────────────────────────── */
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
        <span className="text-lg">{icon}</span>
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── Send confirmation modal ───────────────────────────────────────────── */
function SendModal({
  campaign, preview, onConfirm, onClose, isSending,
}: {
  campaign: any;
  preview: { inSegment: number; reachable: number; filtered: number } | null;
  onConfirm: (reachable: number) => void;
  onClose: () => void;
  isSending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Warning icon */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">⚠️</div>
          <div>
            <h2 className="font-extrabold text-gray-900">¿Enviás la campaña?</h2>
            <p className="text-xs text-gray-500">Esta acción es irreversible.</p>
          </div>
        </div>

        {/* Stats */}
        {preview && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{preview.inSegment.toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-gray-500">en segmento</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-600 tabular-nums">{preview.filtered.toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-red-500">sin consentimiento</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700 tabular-nums">{preview.reachable.toLocaleString('es-AR')}</p>
              <p className="text-[10px] text-emerald-600">recibirán</p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Ley 25.326</strong>: Solo se envía a usuarios que consintieron explícitamente recibir comunicaciones por este canal.
        </div>

        <p className="text-sm text-gray-700">
          Vas a enviar <strong>{campaign.name}</strong> vía{' '}
          <strong>{campaign.channel === 'EMAIL' ? 'Email' : 'SMS'}</strong> a{' '}
          <strong className="text-emerald-700">{preview?.reachable.toLocaleString('es-AR')} usuarios</strong>.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={isSending}>
            Cancelar
          </button>
          <button
            onClick={() => preview && onConfirm(preview.reachable)}
            disabled={!preview || preview.reachable === 0 || isSending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? <><LoadingSpinner /> Enviando...</> : '🚀 Sí, enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Editable field ────────────────────────────────────────────────────── */
function EditableField({
  label, value, onChange, textarea, placeholder, mono,
}: {
  label: string; value: string; onChange: (v: string) => void;
  textarea?: boolean; placeholder?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`input min-h-[140px] resize-y ${mono ? 'font-mono text-sm' : ''}`}
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="input"
        />
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function CampaignDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();

  const [showSendModal, setShowSendModal] = useState(false);
  const [editing,       setEditing]       = useState(false);
  const [editName,      setEditName]      = useState('');
  const [editSubject,   setEditSubject]   = useState('');
  const [editBody,      setEditBody]      = useState('');
  const [editSegId,     setEditSegId]     = useState('');

  /* ─ Queries ─ */
  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.get(id),
  });

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ['campaign-preview', id],
    queryFn: () => campaignsApi.preview(id),
    enabled: !!campaign && campaign.status === 'DRAFT',
    refetchOnWindowFocus: false,
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['admin-segments'],
    queryFn: marketingApi.listSegments,
    enabled: editing,
  });

  /* Seed edit form when campaign loads */
  useEffect(() => {
    if (campaign) {
      setEditName(campaign.name);
      setEditSubject(campaign.subject ?? '');
      setEditBody(campaign.body);
      setEditSegId(campaign.segmentId);
    }
  }, [campaign]);

  /* ─ Mutations ─ */
  const updateMutation = useMutation({
    mutationFn: () => campaignsApi.update(id, {
      name: editName, subject: editSubject, body: editBody, segmentId: editSegId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', id] });
      qc.invalidateQueries({ queryKey: ['campaign-preview', id] });
      setEditing(false);
    },
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al guardar'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => campaignsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', id] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al cancelar'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => campaignsApi.remove(id),
    onSuccess: () => router.push('/admin/campaigns'),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al eliminar'),
  });

  const sendMutation = useMutation({
    mutationFn: (confirmedReachable: number) => campaignsApi.send(id, confirmedReachable),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', id] });
      setShowSendModal(false);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message ?? 'Error al enviar');
      setShowSendModal(false);
    },
  });

  /* ─ Render ─ */
  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!campaign) return (
    <div className="card text-center py-12">
      <p className="text-gray-500">Campaña no encontrada.</p>
      <Link href="/admin/campaigns" className="text-indigo-600 text-sm mt-2 inline-block">← Volver</Link>
    </div>
  );

  const status  = STATUS_CFG[campaign.status] ?? STATUS_CFG.DRAFT;
  const isDraft = campaign.status === 'DRAFT';
  const isSent  = campaign.status === 'SENT';
  const smsLeft = 160 - (editBody?.length ?? 0);

  return (
    <>
      {showSendModal && (
        <SendModal
          campaign={campaign}
          preview={preview ?? null}
          onConfirm={(r) => sendMutation.mutate(r)}
          onClose={() => setShowSendModal(false)}
          isSending={sendMutation.isPending}
        />
      )}

      <div className="space-y-6 max-w-3xl mx-auto">

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/campaigns" className="hover:text-indigo-600 transition-colors">Campañas</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">{campaign.name}</span>
        </div>

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <div className={`relative overflow-hidden rounded-2xl border-2 ${status.border} ${status.bg} p-6`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              {/* Status + channel badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-white/60 ${status.text}`}>
                  <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                <span className="text-[11px] font-medium bg-white/60 px-3 py-1 rounded-full text-gray-700">
                  {campaign.channel === 'EMAIL' ? '✉️ Email' : '📱 SMS'}
                </span>
              </div>

              <h1 className="text-2xl font-extrabold text-gray-900 truncate">{campaign.name}</h1>
              {campaign.subject && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Asunto:</span> {campaign.subject}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Creado por <strong>{campaign.createdBy?.firstName} {campaign.createdBy?.lastName}</strong>
                {' · '}{new Date(campaign.createdAt).toLocaleDateString('es-AR', { dateStyle: 'long' })}
              </p>
            </div>

            {/* Actions */}
            {isDraft && (
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => setShowSendModal(true)}
                  disabled={previewLoading || (preview?.reachable === 0)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                >
                  🚀 Enviar campaña
                </button>
                <button
                  onClick={() => setEditing(e => !e)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-white/70 border border-white text-gray-700 font-semibold text-sm hover:bg-white transition-colors"
                >
                  ✏️ {editing ? 'Cancelar edición' : 'Editar'}
                </button>
                <button
                  onClick={() => confirm('¿Cancelar la campaña?') && cancelMutation.mutate()}
                  className="text-xs text-gray-500 hover:text-red-600 transition-colors text-center"
                >
                  Cancelar campaña
                </button>
              </div>
            )}

            {!isDraft && !isSent && (
              <button
                onClick={() => confirm('¿Eliminar esta campaña?') && deleteMutation.mutate()}
                className="text-xs text-red-600 hover:underline"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>

        {/* ── Sent metrics ─────────────────────────────────────────────── */}
        {isSent && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric value={(campaign.sentCount ?? 0).toLocaleString('es-AR')} label="Enviados" color="text-emerald-600" />
            <Metric value={(campaign.failedCount ?? 0).toLocaleString('es-AR')} label="Fallaron" color={campaign.failedCount > 0 ? 'text-red-600' : 'text-gray-400'} />
            <Metric
              value={campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString('es-AR') : '—'}
              label="Fecha de envío"
            />
            <Metric
              value={campaign.sentAt ? new Date(campaign.sentAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'}
              label="Hora"
            />
          </div>
        )}

        {/* ── Draft preview card ────────────────────────────────────────── */}
        {isDraft && (
          <SectionCard title="Alcance estimado" icon="📊">
            {previewLoading ? (
              <div className="flex justify-center py-4"><LoadingSpinner /></div>
            ) : preview ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-gray-700 tabular-nums">{preview.inSegment.toLocaleString('es-AR')}</p>
                  <p className="text-xs text-gray-500 mt-1">En el segmento</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-red-500 tabular-nums">{preview.filtered.toLocaleString('es-AR')}</p>
                  <p className="text-xs text-red-400 mt-1">Sin consentimiento</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{preview.reachable.toLocaleString('es-AR')}</p>
                  <p className="text-xs text-emerald-600 mt-1">Recibirán el mensaje</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No se pudo calcular el alcance.</p>
            )}
            {preview?.reachable === 0 && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                No hay destinatarios con consentimiento. El envío está bloqueado. Revisá el segmento o las preferencias de los usuarios.
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Segment info ──────────────────────────────────────────────── */}
        <SectionCard title="Segmento" icon="🎯">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-bold text-gray-900">{campaign.segment?.name ?? '—'}</p>
              {campaign.segment?.description && (
                <p className="text-xs text-gray-500 mt-0.5">{campaign.segment.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-indigo-600 tabular-nums">
                {(campaign.segment?.lastCount ?? 0).toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-gray-400">usuarios</p>
            </div>
          </div>
        </SectionCard>

        {/* ── Content (view or edit) ────────────────────────────────────── */}
        <SectionCard title={editing ? 'Editar contenido' : 'Contenido'} icon="📝">
          {editing ? (
            <div className="space-y-4">
              {/* Segment picker in edit mode */}
              <div>
                <label className="label">Segmento</label>
                <select
                  value={editSegId}
                  onChange={e => setEditSegId(e.target.value)}
                  className="input"
                >
                  {(segments as any[]).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({(s.lastCount ?? 0).toLocaleString('es-AR')} usuarios)</option>
                  ))}
                </select>
              </div>

              <EditableField
                label="Nombre de la campaña"
                value={editName}
                onChange={setEditName}
                placeholder="Nombre interno"
              />

              {campaign.channel === 'EMAIL' && (
                <EditableField
                  label="Asunto del email"
                  value={editSubject}
                  onChange={setEditSubject}
                  placeholder="Asunto"
                />
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Cuerpo del mensaje</label>
                  {campaign.channel === 'SMS' && (
                    <span className={`text-xs font-semibold ${smsLeft < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {smsLeft} restantes
                    </span>
                  )}
                </div>
                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  className="input min-h-[160px] resize-y font-mono text-sm"
                  placeholder="Contenido del mensaje..."
                />
              </div>

              {/* Variable helper */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Insertar variable</p>
                <div className="flex gap-2 flex-wrap">
                  {['{{firstName}}', '{{lastName}}', '{{nickname}}'].map(v => (
                    <button key={v} type="button" onClick={() => setEditBody(b => b + v)}
                      className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-mono text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >{v}</button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancelar</button>
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {campaign.subject && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Asunto</p>
                  <p className="text-sm text-gray-800 font-medium">{campaign.subject}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cuerpo</p>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {campaign.body}
                </pre>
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Danger zone ─────────────────────────────────────────────────── */}
        {isDraft && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-red-700 text-sm">Zona de peligro</p>
              <p className="text-xs text-red-500 mt-0.5">Eliminar o cancelar la campaña es permanente.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => confirm('¿Cancelar la campaña?') && cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-100 transition-colors font-medium"
              >
                Cancelar campaña
              </button>
              <button
                onClick={() => confirm(`¿Eliminar "${campaign.name}"?`) && deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="text-xs px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
