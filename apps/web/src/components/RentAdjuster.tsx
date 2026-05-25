'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rentAdjustmentsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

const INDEX_LABELS: Record<string, string> = {
  ICL: 'ICL (Índice de Contratos de Locación)',
  IPC: 'IPC (INDEC, ajuste por DNU 70/2023)',
  ICL_IPC_MIX: 'ICL + IPC 50/50',
};

/**
 * Calcula y aplica ajustes de alquiler según índices oficiales (BCRA).
 * Propietario ve preview + botón aplicar. Inquilino sólo ve histórico.
 */
export function RentAdjuster({
  contractId,
  landlordId,
  currentAmount,
  currency,
}: {
  contractId: string;
  landlordId: string;
  currentAmount: number;
  currency: string;
}) {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [index, setIndex] = useState<'ICL' | 'IPC' | 'ICL_IPC_MIX'>('ICL');

  const isLandlord = user?.id === landlordId;

  const { data: history = [] } = useQuery({
    queryKey: ['rent-adjustments', contractId],
    queryFn: () => rentAdjustmentsApi.listByContract(contractId),
  });

  const { data: preview, isFetching: loadingPreview, refetch } = useQuery({
    queryKey: ['rent-adjustment-preview', contractId, index],
    queryFn: () => rentAdjustmentsApi.preview(contractId, index),
    enabled: isLandlord,
  });

  const { mutate: apply, isPending } = useMutation({
    mutationFn: () => rentAdjustmentsApi.apply(contractId, { index }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rent-adjustments', contractId] });
      qc.invalidateQueries({ queryKey: ['contract', contractId] });
      qc.invalidateQueries({ queryKey: ['rent-adjustment-preview', contractId, index] });
    },
    onError: (err: any) => alert(err?.response?.data?.message ?? 'No se pudo aplicar el ajuste'),
  });

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Ajuste de alquiler</h2>
        <span className="text-[10px] text-gray-400">según índices BCRA</span>
      </div>

      <p className="text-xs text-gray-500">
        Monto actual: <strong className="text-gray-900">${currentAmount.toLocaleString('es-AR')} {currency}/mes</strong>
      </p>

      {/* Preview (sólo landlord) */}
      {isLandlord && (
        <>
          <div>
            <label className="label text-xs">Índice a aplicar</label>
            <select
              className="input text-sm"
              value={index}
              onChange={e => setIndex(e.target.value as any)}
            >
              {Object.entries(INDEX_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>

          {loadingPreview ? (
            <p className="text-xs text-gray-400">Calculando...</p>
          ) : preview ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5 text-sm">
              <p className="text-amber-900 font-medium">Si lo aplicás ahora:</p>
              <p className="text-gray-700">
                Nuevo monto: <strong className="text-gray-900">${Number(preview.newAmount).toLocaleString('es-AR')} {currency}/mes</strong>
              </p>
              <p className="text-xs text-amber-800">
                Variación: <strong>{preview.increasePct >= 0 ? '+' : ''}{preview.increasePct}%</strong>
                {' · '}
                Multiplicador: ×{preview.multiplier}
              </p>
              <p className="text-[11px] text-gray-500">
                Período: {preview.snapshot?.fromDate ?? preview.fromDate} → {preview.snapshot?.toDate ?? preview.toDate}
                {preview.snapshot?.source === 'mock' && ' · datos sintéticos (BCRA no disponible)'}
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => apply()}
                  disabled={isPending}
                  className="btn-primary text-xs flex-1"
                >
                  {isPending ? 'Aplicando...' : `Aplicar ajuste`}
                </button>
                <button
                  onClick={() => refetch()}
                  className="btn-secondary text-xs"
                  disabled={loadingPreview}
                >
                  ↻
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Histórico */}
      {history.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500 font-medium mb-2">Ajustes anteriores</p>
          <div className="space-y-2">
            {history.map((a: any) => (
              <div key={a.id} className="text-xs flex items-center justify-between border-b border-gray-50 pb-1">
                <div>
                  <p className="font-medium text-gray-700">{a.index} · {a.periodLabel}</p>
                  <p className="text-gray-400 text-[10px]">
                    {new Date(a.effectiveFrom).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 line-through text-[10px]">
                    ${Number(a.previousAmount).toLocaleString('es-AR')}
                  </p>
                  <p className="text-gray-900 font-bold">
                    ${Number(a.newAmount).toLocaleString('es-AR')}
                  </p>
                  <p className="text-[9px] text-gray-400">×{Number(a.multiplier).toFixed(3)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLandlord && history.length === 0 && (
        <p className="text-xs text-gray-400">Aún no se aplicaron ajustes a este contrato.</p>
      )}
    </div>
  );
}
