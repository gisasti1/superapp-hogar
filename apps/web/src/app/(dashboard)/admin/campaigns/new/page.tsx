'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { marketingApi, campaignsApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Channel = 'EMAIL' | 'SMS';

/* ─── Step indicator ────────────────────────────────────────────────────── */
function StepDot({ n, current, done }: { n: number; current: number; done: boolean }) {
  const active = n === current;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
        ${done    ? 'bg-emerald-500 text-white'
        : active  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
        :           'bg-gray-100 text-gray-400'}
      `}>
        {done ? '✓' : n}
      </div>
    </div>
  );
}

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => i + 1).map((n, i) => (
        <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
          <StepDot n={n} current={current} done={n < current} />
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 rounded ${n < current ? 'bg-emerald-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Channel card ──────────────────────────────────────────────────────── */
function ChannelCard({ value, selected, onSelect }: {
  value: Channel; selected: boolean; onSelect: () => void;
}) {
  const cfg = value === 'EMAIL'
    ? { icon: '✉️', title: 'Email', desc: 'Ideal para contenido largo, imágenes y HTML rico. SendGrid.' }
    : { icon: '📱', title: 'SMS',   desc: 'Máximo 160 caracteres. Alta tasa de apertura. Twilio.' };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        flex-1 p-5 rounded-2xl border-2 text-left transition-all
        ${selected
          ? 'border-indigo-500 bg-indigo-50 shadow-md'
          : 'border-gray-200 hover:border-indigo-300 bg-white'}
      `}
    >
      <div className="text-3xl mb-2">{cfg.icon}</div>
      <p className="font-bold text-gray-900">{cfg.title}</p>
      <p className="text-xs text-gray-500 mt-1">{cfg.desc}</p>
      <div className={`mt-3 w-4 h-4 rounded-full border-2 flex items-center justify-center
        ${selected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}
      >
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
    </button>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [channel,   setChannel]   = useState<Channel>('EMAIL');
  const [segmentId, setSegmentId] = useState('');
  const [name,      setName]      = useState('');
  const [subject,   setSubject]   = useState('');
  const [body,      setBody]      = useState('');

  /* Segments */
  const { data: segments = [], isLoading: loadingSegments } = useQuery({
    queryKey: ['admin-segments'],
    queryFn: marketingApi.listSegments,
  });

  /* Mutation */
  const createMutation = useMutation({
    mutationFn: () => campaignsApi.create({ name, segmentId, channel, subject: channel === 'EMAIL' ? subject : undefined, body }),
    onSuccess: (c: any) => router.push(`/admin/campaigns/${c.id}`),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al crear la campaña'),
  });

  /* Validation per step */
  const step1Valid = !!segmentId && !!channel;
  const step2Valid = !!name.trim() && (channel === 'SMS' || !!subject.trim());
  const step3Valid = !!body.trim() && (channel === 'SMS' ? body.length <= 160 : true);

  const selectedSegment = (segments as any[]).find(s => s.id === segmentId);
  const smsLeft = 160 - body.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href="/admin/campaigns" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Nueva campaña</p>
          <h1 className="text-xl font-extrabold text-gray-900">Crear campaña</h1>
        </div>
      </div>

      {/* ── Step bar ────────────────────────────────────────────────────── */}
      <StepBar current={step} total={3} />

      {/* ── Steps ───────────────────────────────────────────────────────── */}

      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Canal y segmento</h2>
              <p className="text-sm text-gray-500 mt-0.5">Elegí por dónde vas a mandar y a quiénes.</p>
            </div>

            {/* Channel */}
            <div>
              <label className="label">Canal</label>
              <div className="flex gap-3">
                <ChannelCard value="EMAIL" selected={channel === 'EMAIL'} onSelect={() => setChannel('EMAIL')} />
                <ChannelCard value="SMS"   selected={channel === 'SMS'}   onSelect={() => setChannel('SMS')}   />
              </div>
            </div>

            {/* Segment */}
            <div>
              <label className="label">Segmento de destino</label>
              {loadingSegments ? (
                <div className="py-4 flex justify-center"><LoadingSpinner /></div>
              ) : (segments as any[]).length === 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                  No tenés segmentos. <Link href="/admin/segments/new" className="font-semibold underline">Crear uno →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {(segments as any[]).map((s: any) => (
                    <label
                      key={s.id}
                      className={`
                        flex items-center justify-between gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${segmentId === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 bg-white'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="segment"
                          value={s.id}
                          checked={segmentId === s.id}
                          onChange={() => setSegmentId(s.id)}
                          className="accent-indigo-600 w-4 h-4"
                        />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                          {s.description && <p className="text-xs text-gray-500">{s.description}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-700 tabular-nums">{(s.lastCount ?? 0).toLocaleString('es-AR')}</p>
                        <p className="text-[10px] text-gray-400">usuarios</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="btn-primary"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Identificación</h2>
              <p className="text-sm text-gray-500 mt-0.5">Nombre interno y asunto (si es email).</p>
            </div>

            {/* Summary chip */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                {channel === 'EMAIL' ? '✉️' : '📱'} {channel}
              </span>
              {selectedSegment && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                  🎯 {selectedSegment.name}
                </span>
              )}
            </div>

            <div>
              <label className="label">Nombre de la campaña <span className="text-gray-400 font-normal">(solo visible para admins)</span></label>
              <input
                className="input"
                placeholder="Ej: Email bienvenida inquilinos mayo"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {channel === 'EMAIL' && (
              <div>
                <label className="label">Asunto del email <span className="text-red-400">*</span></label>
                <input
                  className="input"
                  placeholder="Ej: 🏡 Descubrí los mejores servicios para tu hogar"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Aparece en la bandeja de entrada del destinatario.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary">← Atrás</button>
            <button onClick={() => setStep(3)} disabled={!step2Valid} className="btn-primary">Siguiente →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Contenido</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Podés usar {' '}
                <code className="bg-gray-100 px-1 rounded text-xs">{'{{firstName}}'}</code>,{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">{'{{nickname}}'}</code> y{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">{'{{lastName}}'}</code> como variables.
              </p>
            </div>

            {/* Summary chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                {channel === 'EMAIL' ? '✉️' : '📱'} {channel}
              </span>
              {selectedSegment && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                  🎯 {selectedSegment.name} · {(selectedSegment.lastCount ?? 0).toLocaleString('es-AR')} usuarios
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">
                  {channel === 'EMAIL' ? 'Cuerpo del email' : 'Texto del SMS'}
                </label>
                {channel === 'SMS' && (
                  <span className={`text-xs font-semibold tabular-nums ${smsLeft < 0 ? 'text-red-600' : smsLeft < 20 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {smsLeft} caracteres restantes
                  </span>
                )}
              </div>
              <textarea
                className={`input min-h-[200px] resize-y font-mono text-sm ${
                  channel === 'SMS' && smsLeft < 0 ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder={
                  channel === 'EMAIL'
                    ? 'Hola {{firstName}},\n\nTe escribimos para contarte...'
                    : 'Hola {{firstName}}, tenemos una promo especial para vos 🏡'
                }
                value={body}
                onChange={e => setBody(e.target.value)}
              />
              {channel === 'SMS' && smsLeft < 0 && (
                <p className="text-xs text-red-600 mt-1">
                  El SMS supera los 160 caracteres y se fragmentará. Reducí el texto.
                </p>
              )}
              {channel === 'EMAIL' && (
                <p className="text-xs text-gray-400 mt-1">
                  Los saltos de línea se convierten en {'<br>'} automáticamente.
                </p>
              )}
            </div>

            {/* Variable cheatsheet */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Variables disponibles</p>
              <div className="flex gap-2 flex-wrap">
                {['{{firstName}}', '{{lastName}}', '{{nickname}}', '{{name}}'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBody(b => b + v)}
                    className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-mono text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary">← Atrás</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!step3Valid || createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending
                ? <><LoadingSpinner />Guardando...</>
                : 'Guardar borrador →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
