'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { receiptsApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const SOURCE_LABEL: Record<string, string> = {
  CONTRACT_PAYMENT: 'Pago de contrato',
  EXTERNAL_PAYMENT: 'Alquiler externo',
  BILLS_MONTHLY:    'Presupuesto mensual',
  OTHER:            'Otro',
};

function fmtMoney(n: number | string, c = 'ARS') {
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${c}`;
}

/**
 * Página pública (SIN auth) para verificar un recibo por su hash sha256.
 * El que recibió un comprobante por WhatsApp / email puede entrar acá y
 * confirmar que el recibo fue realmente emitido por la plataforma.
 */
export default function VerifyReceiptPage() {
  const { hash } = useParams<{ hash: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['verify-receipt', hash],
    queryFn:  () => receiptsApi.verify(hash),
    retry:    false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white text-2xl shadow-lg mb-3">🏡</div>
          <h1 className="text-xl font-extrabold text-gray-900">SuperApp Hogar</h1>
          <p className="text-xs text-gray-500">Verificación pública de recibo</p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : !data?.valid ? (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 text-center space-y-2">
            <div className="text-5xl">❌</div>
            <h2 className="font-extrabold text-red-700">Recibo no encontrado</h2>
            <p className="text-sm text-red-600/80">
              El hash que estás verificando no corresponde a ningún recibo emitido por esta plataforma.
            </p>
            <p className="text-[10px] font-mono text-gray-400 break-all mt-3">{hash}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-4 text-center">
              <div className="text-3xl">✅</div>
              <p className="font-extrabold mt-1">Recibo verificado</p>
              <p className="text-xs opacity-80 mt-0.5">Emitido por SuperApp Hogar</p>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-gray-400">N° de recibo</p>
                  <p className="font-mono font-bold text-gray-900">{data.number}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Tipo</p>
                  <p className="font-semibold text-gray-900">{SOURCE_LABEL[data.sourceType] ?? data.sourceType}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase text-gray-400">Monto pagado</p>
                  <p className="font-extrabold text-emerald-700 text-xl">{fmtMoney(data.amount, data.currency)}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Pagó</p>
                  <p className="font-semibold text-gray-900">{data.payerName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Recibió</p>
                  <p className="font-semibold text-gray-900">{data.receiverName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Fecha de pago</p>
                  <p className="text-gray-900">{new Date(data.paidAt).toLocaleDateString('es-AR')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Emitido</p>
                  <p className="text-gray-900">{new Date(data.emittedAt).toLocaleDateString('es-AR')}</p>
                </div>
                {data.description && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase text-gray-400">Concepto</p>
                    <p className="text-gray-700">{data.description}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 bg-gray-50 -mx-5 -mb-5 px-5 py-3 text-[10px] text-gray-500 break-all font-mono">
                <p className="uppercase font-bold text-[10px] text-gray-400 mb-1">Hash sha256</p>
                {hash}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          ¿Querés ver más?{' '}
          <Link href="/" className="text-brand-600 font-semibold hover:underline">Conocé SuperApp Hogar</Link>
        </p>
      </div>
    </div>
  );
}
