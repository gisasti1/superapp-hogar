'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { receiptsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const SOURCE_LABEL: Record<string, { label: string; icon: string; color: string }> = {
  CONTRACT_PAYMENT: { label: 'Pago de contrato',         icon: '📄', color: 'bg-emerald-100 text-emerald-700' },
  EXTERNAL_PAYMENT: { label: 'Alquiler externo',          icon: '🏠', color: 'bg-rose-100 text-rose-700' },
  BILLS_MONTHLY:    { label: 'Presupuesto mensual',       icon: '💸', color: 'bg-indigo-100 text-indigo-700' },
  OTHER:            { label: 'Otro',                       icon: '📦', color: 'bg-gray-100 text-gray-600' },
};
const METHOD_LABEL: Record<string, string> = {
  CASH:        'Efectivo',
  TRANSFER:    'Transferencia',
  MERCADOPAGO: 'Mercado Pago',
  CARD:        'Tarjeta',
  AUTO_DEBIT:  'Débito automático',
  OTHER:       'Otro',
};

function fmtMoney(n: number | string, c = 'ARS') {
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${c}`;
}

export default function ReceiptsPage() {
  const me = useAuthStore(s => s.user);
  const [tab, setTab] = useState<'all' | 'in' | 'out'>('all');
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn:  () => receiptsApi.list(),
  });

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  const filtered = (receipts as any[]).filter(r => {
    if (tab === 'in')  return r.receiverId === me?.id;
    if (tab === 'out') return r.payerId === me?.id;
    return true;
  });

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Comprobantes</p>
        <h1 className="text-2xl font-extrabold">Recibos de pago</h1>
        <p className="mt-1 text-sm opacity-90 max-w-md">
          Recibos NO fiscales emitidos por la plataforma. Cada uno tiene un hash sha256 público
          para que la otra parte pueda verificar que es válido.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['all','out','in'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
              tab === t ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
            }`}
          >
            {t === 'all' ? 'Todos' : t === 'out' ? 'Que emitiste' : 'Que recibiste'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
          <p className="text-4xl mb-2">🧾</p>
          <p className="text-sm">No tenés recibos para mostrar.</p>
          <p className="text-xs mt-1">Cada vez que registres un pago, generamos uno automáticamente.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r: any) => (
            <ReceiptCard key={r.id} receipt={r} meId={me?.id ?? ''} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReceiptCard({ receipt: r, meId }: { receipt: any; meId: string }) {
  const cfg     = SOURCE_LABEL[r.sourceType] ?? SOURCE_LABEL.OTHER;
  const iPaid   = r.payerId === meId;
  const partner = iPaid ? r.receiverName : r.payerName;

  return (
    <li className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="text-3xl shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg.color}`}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">{r.number}</span>
          </div>
          <p className="font-bold text-gray-900 text-lg">{fmtMoney(r.amount, r.currency)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {iPaid ? 'Vos pagaste' : 'Te pagaron'} · {partner}
            {r.method && <> · {METHOD_LABEL[r.method] ?? r.method}</>}
          </p>
          {r.description && <p className="text-xs text-gray-500 italic mt-1">"{r.description}"</p>}
          <p className="text-[10px] text-gray-400 mt-1">
            Pago: {new Date(r.paidAt).toLocaleDateString('es-AR')} ·
            Emitido: {new Date(r.emittedAt).toLocaleDateString('es-AR')}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => receiptsApi.download(r.id, r.number)}
            className="text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg"
          >
            📄 Descargar
          </button>
          <a
            href={`/verify/${r.payloadHash}`}
            target="_blank"
            rel="noopener"
            className="text-xs font-medium text-gray-500 hover:text-teal-700 text-center"
            title="Página pública para verificar este recibo"
          >
            🔗 Verificar
          </a>
        </div>
      </div>

      {/* Desglose (bills) */}
      {Array.isArray(r.breakdown) && r.breakdown.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-900">
            Ver desglose ({r.breakdown.length} items)
          </summary>
          <ul className="mt-2 ml-4 space-y-1 text-xs text-gray-600">
            {r.breakdown.map((b: any, i: number) => (
              <li key={i} className="flex justify-between">
                <span>{b.label}</span>
                <span className="font-mono">{fmtMoney(b.amount, r.currency)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
