'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { paymentsApi } from '@/lib/api';
import { PaymentStatus, PaymentType } from '@superapp/shared';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/stores/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const fileUrl = (u: string) => !u ? '' : u.startsWith('http') ? u : `${API_BASE}${u}`;

type Tab = 'pending' | 'history';

const STATUS_VARIANT: Record<string, string> = {
  [PaymentStatus.PENDING]: 'warning',
  [PaymentStatus.PROCESSING]: 'info',
  [PaymentStatus.PAID]: 'success',
  [PaymentStatus.FAILED]: 'error',
  [PaymentStatus.REFUNDED]: 'neutral',
  [PaymentStatus.OVERDUE]: 'error',
  RECEIPT_REVIEW: 'info',
};

const STATUS_LABELS: Record<string, string> = {
  [PaymentStatus.PENDING]: 'Pendiente',
  [PaymentStatus.PROCESSING]: 'Procesando',
  [PaymentStatus.PAID]: 'Pagado',
  [PaymentStatus.FAILED]: 'Fallido',
  [PaymentStatus.REFUNDED]: 'Reembolsado',
  [PaymentStatus.OVERDUE]: 'Vencido',
  RECEIPT_REVIEW: 'Esperando revisión',
};

const TYPE_LABELS: Record<string, string> = {
  [PaymentType.RENT]: 'Alquiler',
  [PaymentType.INSURANCE_PREMIUM]: 'Prima de seguro',
  [PaymentType.DEPOSIT]: 'Depósito',
  [PaymentType.SERVICE]: 'Servicio',
  [PaymentType.MEDIATION_FEE]: 'Mediación',
  [PaymentType.SUBSCRIPTION]: 'Suscripción',
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsApi.list,
  });

  const initPaymentMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.initPayment(id),
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
      }
    },
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: ({ id, file, note }: { id: string; file: File; note?: string }) =>
      paymentsApi.uploadReceipt(id, file, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      setUploadingFor(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.approveReceipt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      paymentsApi.rejectReceipt(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });

  const pending = payments?.filter((p: any) =>
    [PaymentStatus.PENDING, PaymentStatus.OVERDUE, 'RECEIPT_REVIEW'].includes(p.status),
  ) ?? [];

  const history = payments?.filter((p: any) =>
    ![PaymentStatus.PENDING, PaymentStatus.OVERDUE, 'RECEIPT_REVIEW'].includes(p.status),
  ) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="text-gray-500 mt-1">Gestioná tus pagos y cobros</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['pending', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t === 'pending' ? `Pendientes${pending.length ? ` (${pending.length})` : ''}` : 'Historial'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card py-16">
          <LoadingSpinner />
        </div>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="✅"
              title="No tenés pagos pendientes"
              description="Estás al día con todos tus pagos."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pending.map((p: any) => {
              const isPayer = p.payerId === user?.id;
              const isReceiver = p.receiverId === user?.id;
              const isReviewing = p.status === 'RECEIPT_REVIEW';
              return (
                <div key={p.id} className="card flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {TYPE_LABELS[p.type] ?? p.type}
                      </p>
                      {p.contractId && (
                        <p className="text-xs text-gray-400 mt-0.5">Contrato #{p.contractId.slice(-8)}</p>
                      )}
                    </div>
                    <Badge variant={STATUS_VARIANT[p.status]}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${Number(p.amount).toLocaleString('es-AR')}
                        <span className="text-sm font-normal text-gray-400 ml-1">{p.currency}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Vence: {new Date(p.dueDate).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  </div>

                  {p.rejectedReason && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-2">
                      <strong>Comprobante rechazado:</strong> {p.rejectedReason}
                    </div>
                  )}

                  {/* Vista pagador (inquilino) */}
                  {isPayer && !isReviewing && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <button
                        className="btn-primary flex-1"
                        disabled={initPaymentMutation.isPending}
                        onClick={() => initPaymentMutation.mutate(p.id)}
                      >
                        Pagar con MP →
                      </button>
                      <button
                        className="btn-secondary flex-1 text-sm"
                        onClick={() => setUploadingFor(p.id)}
                      >
                        📎 Subir comprobante
                      </button>
                    </div>
                  )}

                  {/* Modal de upload de comprobante */}
                  {uploadingFor === p.id && (
                    <ReceiptUploadInline
                      paymentId={p.id}
                      isPending={uploadReceiptMutation.isPending}
                      onUpload={(file, note) => uploadReceiptMutation.mutate({ id: p.id, file, note })}
                      onCancel={() => setUploadingFor(null)}
                    />
                  )}

                  {/* Vista revisor (propietario): comprobante esperando */}
                  {isReceiver && isReviewing && p.receiptUrl && (
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      <a
                        href={fileUrl(p.receiptUrl)}
                        target="_blank"
                        rel="noopener"
                        className="text-sm text-brand-600 hover:underline flex items-center gap-1"
                      >
                        📎 Ver comprobante
                      </a>
                      {p.receiptNote && (
                        <p className="text-xs text-gray-500 italic">"{p.receiptNote}"</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveMutation.mutate(p.id)}
                          disabled={approveMutation.isPending}
                          className="btn-primary flex-1 text-sm"
                        >
                          ✓ Aprobar
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Motivo del rechazo:');
                            if (reason) rejectMutation.mutate({ id: p.id, note: reason });
                          }}
                          disabled={rejectMutation.isPending}
                          className="btn-secondary text-sm"
                        >
                          ✕ Rechazar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Vista pagador con comprobante en revisión */}
                  {isPayer && isReviewing && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-amber-700">
                        ⏳ Tu comprobante está esperando aprobación del propietario.
                      </p>
                      {p.receiptUrl && (
                        <a
                          href={fileUrl(p.receiptUrl)}
                          target="_blank"
                          rel="noopener"
                          className="text-xs text-brand-600 hover:underline mt-1 inline-block"
                        >
                          Ver mi comprobante →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="💳"
              title="Sin historial de pagos"
              description="Los pagos completados aparecerán aquí."
            />
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Monto</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(p.paidAt ?? p.dueDate).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ${Number(p.amount).toLocaleString('es-AR')} {p.currency}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_VARIANT[p.status]}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

/**
 * Componente inline para subir comprobante. Aparece debajo de cada pago pendiente
 * cuando el usuario clickea "Subir comprobante". No usamos un modal porque las
 * páginas Next.js con hydration de React Query dan menos problemas con componentes
 * inline en mobile.
 */
function ReceiptUploadInline({
  paymentId,
  isPending,
  onUpload,
  onCancel,
}: {
  paymentId: string;
  isPending: boolean;
  onUpload: (file: File, note?: string) => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="pt-3 border-t border-gray-100 space-y-2 bg-amber-50 -mx-5 -mb-5 px-5 pb-4 rounded-b-xl">
      <p className="text-xs text-amber-900 font-medium">
        Subí una foto o PDF de la transferencia / depósito. El propietario lo aprueba en su panel.
      </p>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        className="text-xs block w-full"
      />
      <textarea
        className="input text-sm min-h-[60px]"
        placeholder="Nota opcional (ej: 'transferencia desde Mercado Pago, ref XXX')"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={() => file && onUpload(file, note || undefined)}
          disabled={!file || isPending}
          className="btn-primary text-sm flex-1"
        >
          {isPending ? 'Subiendo...' : 'Enviar comprobante'}
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
      </div>
    </div>
  );
}
