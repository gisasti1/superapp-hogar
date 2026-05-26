'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ─── Status config ─────────────────────────────────────────────────────── */
const STATUS: Record<string, { label: string; dot: string; border: string; bg: string; text: string }> = {
  DRAFT:     { label: 'Borrador',  dot: 'bg-amber-400',  border: 'border-amber-300',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  SENT:      { label: 'Enviada',   dot: 'bg-emerald-500', border: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CANCELLED: { label: 'Cancelada', dot: 'bg-gray-400',    border: 'border-gray-200',   bg: 'bg-gray-50',   text: 'text-gray-500' },
};

const CHANNEL: Record<string, { label: string; icon: string; color: string }> = {
  EMAIL: { label: 'Email', icon: '✉️', color: 'bg-blue-50 text-blue-700' },
  SMS:   { label: 'SMS',   icon: '📱', color: 'bg-violet-50 text-violet-700' },
};

/* ─── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AdminCampaignsPage() {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: campaignsApi.list,
  });

  const sent      = campaigns.filter((c: any) => c.status === 'SENT');
  const draft     = campaigns.filter((c: any) => c.status === 'DRAFT');
  const totalSent = sent.reduce((acc: number, c: any) => acc + (c.sentCount ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Marketing</p>
            <h1 className="text-2xl font-extrabold">Campañas</h1>
            <p className="mt-1 text-sm opacity-80 max-w-md">
              Email y SMS dirigidos a segmentos específicos. Solo llegan a quienes dieron su consentimiento.
            </p>
          </div>
          <Link
            href="/admin/campaigns/new"
            className="shrink-0 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors border border-white/30"
          >
            <span className="text-base">+</span> Nueva campaña
          </Link>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      {!isLoading && campaigns.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={campaigns.length} label="Total campañas" />
          <StatCard value={sent.length}      label="Enviadas" />
          <StatCard value={draft.length}     label="En borrador" />
          <StatCard value={totalSent.toLocaleString('es-AR')} label="Mensajes enviados" sub="acumulado" />
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>

      ) : campaigns.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">📨</div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">Todavía no hay campañas</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              Antes de crear una campaña, asegurate de tener al menos un segmento configurado.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/segments" className="btn-secondary text-sm">Ver segmentos</Link>
            <Link href="/admin/campaigns/new" className="btn-primary text-sm">+ Nueva campaña</Link>
          </div>
        </div>

      ) : (
        <div className="space-y-3">
          {campaigns.map((c: any) => {
            const status  = STATUS[c.status]  ?? STATUS.DRAFT;
            const channel = CHANNEL[c.channel] ?? CHANNEL.EMAIL;

            return (
              <Link
                key={c.id}
                href={`/admin/campaigns/${c.id}`}
                className={`
                  group block bg-white rounded-2xl border shadow-sm hover:shadow-md
                  transition-all duration-200 overflow-hidden
                  border-l-4 ${status.border}
                `}
              >
                <div className="p-5 flex items-start justify-between gap-4 flex-wrap">

                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      {/* Channel badge */}
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${channel.color}`}>
                        {channel.icon} {channel.label}
                      </span>
                    </div>

                    <p className="font-bold text-gray-900 text-base group-hover:text-indigo-700 transition-colors truncate">
                      {c.name}
                    </p>

                    {c.subject && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        Asunto: <span className="italic">{c.subject}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {c.segment && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          🎯 {c.segment.name}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">
                        {c.createdBy?.firstName} {c.createdBy?.lastName} · {new Date(c.createdAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </div>

                  {/* Right: metric */}
                  <div className="text-right shrink-0">
                    {c.status === 'SENT' ? (
                      <>
                        <p className="text-3xl font-extrabold text-emerald-600 tabular-nums leading-none">
                          {(c.sentCount ?? 0).toLocaleString('es-AR')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">enviados</p>
                        {c.failedCount > 0 && (
                          <p className="text-xs text-red-500 mt-0.5">{c.failedCount} fallaron</p>
                        )}
                        {c.sentAt && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            {new Date(c.sentAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-extrabold text-gray-300 tabular-nums leading-none">
                          {(c.segment?.lastCount ?? 0).toLocaleString('es-AR')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">en segmento</p>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
