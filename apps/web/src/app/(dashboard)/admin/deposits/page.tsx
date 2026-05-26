'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ─── Helpers ──────────────────────────────────────────────────────── */
const STATUS_COLOR: Record<string, string> = {
  HELD:               'bg-blue-100 text-blue-700',
  PARTIALLY_RELEASED: 'bg-amber-100 text-amber-700',
  RELEASED:           'bg-emerald-100 text-emerald-700',
  DISPUTED:           'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  HELD: 'En custodia', PARTIALLY_RELEASED: 'Parcial', RELEASED: 'Devuelto', DISPUTED: 'En disputa',
};

function fmtMoney(n: number | string, c = 'ARS') {
  return `$${Number(n).toLocaleString('es-AR')} ${c}`;
}
function fmtDate(d?: string | Date | null) {
  return d ? new Date(d).toLocaleDateString('es-AR') : '—';
}
function daysUntil(d?: string | Date | null) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/* ─── Page ─────────────────────────────────────────────────────────── */
export default function AdminDepositsPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<{ status: string; invested: string; currency: string; search: string }>({
    status: 'ALL', invested: '', currency: '', search: '',
  });
  const [editing, setEditing] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-deposits', filters],
    queryFn:  () => adminApi.listDeposits({
      status:   filters.status,
      invested: filters.invested ? (filters.invested as any) : undefined,
      currency: filters.currency || undefined,
      search:   filters.search   || undefined,
    }),
  });

  const deposits = data?.deposits ?? [];
  const byCurrency = data?.byCurrency ?? {};

  return (
    <div className="space-y-6">

      {/* Hero / agregados */}
      <div className="bg-gradient-to-br from-slate-800 via-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Custodia / Inversiones</p>
        <h1 className="text-2xl font-extrabold mb-1">Depósitos de garantía</h1>
        <p className="text-sm opacity-80 max-w-xl">
          Ventanilla neutral. Cada depósito tiene su trazabilidad: qué inquilino, qué contrato, plazos y dónde está colocado el dinero.
        </p>

        {/* Totales por moneda */}
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.keys(byCurrency).length === 0 ? (
            <div className="col-span-full text-sm opacity-70">Sin depósitos para mostrar.</div>
          ) : Object.entries(byCurrency).map(([c, agg]: any) => (
            <div key={c} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-[10px] uppercase tracking-wider opacity-70">Total custodia ({c})</p>
              <p className="font-extrabold text-xl">{fmtMoney(agg.custodyTotal, c)}</p>
              <div className="mt-2 text-xs opacity-80 flex justify-between">
                <span>Invertido: <strong>{fmtMoney(agg.investedTotal, c)}</strong></span>
                <span>Libre: <strong>{fmtMoney(agg.freeTotal, c)}</strong></span>
              </div>
              <p className="text-[10px] opacity-60 mt-1">{agg.count} depósitos</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 grid sm:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="Buscar contrato, usuario, email…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select className="input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="ALL">Estado: todos</option>
          <option value="HELD">En custodia</option>
          <option value="PARTIALLY_RELEASED">Parcial</option>
          <option value="RELEASED">Devuelto</option>
          <option value="DISPUTED">En disputa</option>
        </select>
        <select className="input" value={filters.invested} onChange={e => setFilters(f => ({ ...f, invested: e.target.value }))}>
          <option value="">Inversión: todos</option>
          <option value="yes">Invertidos</option>
          <option value="no">Sin invertir</option>
        </select>
        <select className="input" value={filters.currency} onChange={e => setFilters(f => ({ ...f, currency: e.target.value }))}>
          <option value="">Moneda: todas</option>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : deposits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🏦</p>
          <p>No hay depósitos que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Inquilino / Contrato</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Inversión</th>
                <th className="px-4 py-3">Plazo</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deposits.map((d: any) => {
                const tenant = d.contract?.tenant;
                const daysToReturn = daysUntil(d.expectedReleaseDate);
                const daysToMaturity = daysUntil(d.investmentMaturity);
                return (
                  <tr key={d.id} className="hover:bg-gray-50/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm">
                        {tenant ? `${tenant.firstName} ${tenant.lastName}` : d.user?.email}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {d.contract?.property?.address ?? d.contractId}
                        {d.contract?.endDate && <> · fin {fmtDate(d.contract.endDate)}</>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {fmtMoney(d.amount, d.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLOR[d.status]}`}>
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.investedIn ? (
                        <div className="text-xs">
                          <p className="font-semibold text-gray-900">💼 {d.investedIn}</p>
                          {d.interestRatePct && <p className="text-[10px] text-gray-400">TNA {Number(d.interestRatePct)}%</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">⚠️ Sin invertir</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-[11px] text-gray-500">
                      {d.investmentMaturity && (
                        <div>
                          <p>Vence inv: <strong>{fmtDate(d.investmentMaturity)}</strong></p>
                          {daysToMaturity !== null && (
                            <p className={daysToMaturity < 30 ? 'text-amber-600 font-semibold' : ''}>
                              en {daysToMaturity} días
                            </p>
                          )}
                        </div>
                      )}
                      {d.expectedReleaseDate && (
                        <p className="mt-1">Devuelve: <strong>{fmtDate(d.expectedReleaseDate)}</strong>
                          {daysToReturn !== null && <span className="text-gray-400"> ({daysToReturn}d)</span>}
                        </p>
                      )}
                      {!d.investmentMaturity && !d.expectedReleaseDate && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(d)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                        ✏️ Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <InvestmentModal
          deposit={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['admin-deposits'] }); }}
        />
      )}
    </div>
  );
}

/* ─── Modal de gestión de inversión ───────────────────────────────── */
function InvestmentModal({ deposit, onClose, onSaved }: { deposit: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    investedIn:          deposit.investedIn          ?? '',
    investedAt:          deposit.investedAt          ? new Date(deposit.investedAt).toISOString().slice(0,10) : '',
    investmentMaturity:  deposit.investmentMaturity  ? new Date(deposit.investmentMaturity).toISOString().slice(0,10) : '',
    interestRatePct:     deposit.interestRatePct     ?? '',
    expectedReleaseDate: deposit.expectedReleaseDate ? new Date(deposit.expectedReleaseDate).toISOString().slice(0,10)
                          : deposit.contract?.endDate ? new Date(deposit.contract.endDate).toISOString().slice(0,10) : '',
    investmentNotes:     deposit.investmentNotes     ?? '',
  });

  const save = useMutation({
    mutationFn: () => adminApi.updateDepositInvestment(deposit.id, {
      investedIn:          form.investedIn || null,
      investedAt:          form.investedAt || null,
      investmentMaturity:  form.investmentMaturity || null,
      interestRatePct:     form.interestRatePct === '' ? null : Number(form.interestRatePct),
      expectedReleaseDate: form.expectedReleaseDate || null,
      investmentNotes:     form.investmentNotes || null,
    }),
    onSuccess: onSaved,
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error al guardar'),
  });

  const clearInvestment = () => {
    if (!confirm('¿Marcar este depósito como NO invertido (cuenta espejo / sin colocar)?')) return;
    setForm({ ...form, investedIn: '', investedAt: '', investmentMaturity: '', interestRatePct: '', investmentNotes: '' });
    // Aplicar de una vez
    adminApi.updateDepositInvestment(deposit.id, {
      investedIn: null, investedAt: null, investmentMaturity: null,
      interestRatePct: null, investmentNotes: null,
      expectedReleaseDate: form.expectedReleaseDate || null,
    }).then(() => onSaved()).catch((e: any) => alert(e?.response?.data?.message ?? 'Error'));
  };

  const c = deposit.contract;
  const t = c?.tenant;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-70">Depósito en custodia</p>
            <p className="font-extrabold text-lg">{fmtMoney(deposit.amount, deposit.currency)}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
        </div>

        {/* Contexto del depósito */}
        <div className="px-6 py-4 border-b border-gray-100 grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Inquilino</p>
            <p className="font-semibold text-gray-900">{t ? `${t.firstName} ${t.lastName}` : '—'}</p>
            <p className="text-xs text-gray-500">{t?.email}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Inmueble</p>
            <p className="font-semibold text-gray-900 text-xs">{c?.property?.address ?? '—'}</p>
            <p className="text-xs text-gray-500">{c?.property?.city}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Contrato</p>
            <p className="font-mono text-[11px] text-gray-700 break-all">{deposit.contractId}</p>
            <p className="text-xs text-gray-500">{fmtDate(c?.startDate)} → {fmtDate(c?.endDate)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Estado</p>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLOR[deposit.status]}`}>
              {STATUS_LABEL[deposit.status] ?? deposit.status}
            </span>
            <p className="text-xs text-gray-500 mt-1">Depositado: {fmtDate(deposit.depositedAt)}</p>
          </div>
        </div>

        {/* Form de inversión */}
        <div className="px-6 py-5 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">💼 Inversión</h3>

          <div>
            <label className="label">¿Dónde está invertido?</label>
            <input
              className="input"
              value={form.investedIn}
              onChange={e => setForm(f => ({ ...f, investedIn: e.target.value }))}
              placeholder="Ej: Banco Galicia — Plazo Fijo 30 días, FCI Pellegrini, BCRA Leliq…"
            />
            <p className="text-[10px] text-gray-400 mt-1">Vacío = sin invertir (queda como custodia simple)</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Fecha de inversión</label>
              <input className="input" type="date" value={form.investedAt} onChange={e => setForm(f => ({ ...f, investedAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Vencimiento inversión</label>
              <input className="input" type="date" value={form.investmentMaturity} onChange={e => setForm(f => ({ ...f, investmentMaturity: e.target.value }))} />
            </div>
            <div>
              <label className="label">TNA (% anual)</label>
              <input className="input" type="number" step="0.01" min="0" value={form.interestRatePct} onChange={e => setForm(f => ({ ...f, interestRatePct: e.target.value }))} placeholder="Ej: 120" />
            </div>
          </div>

          <div>
            <label className="label">Plazo estimado de devolución al inquilino</label>
            <input
              className="input"
              type="date"
              value={form.expectedReleaseDate}
              onChange={e => setForm(f => ({ ...f, expectedReleaseDate: e.target.value }))}
            />
            <p className="text-[10px] text-gray-400 mt-1">Default sugerido: fin del contrato. Lo podés mover si hay buffer de revisión del inmueble.</p>
          </div>

          <div>
            <label className="label">Notas internas</label>
            <textarea
              className="input min-h-[60px] text-xs"
              value={form.investmentNotes}
              onChange={e => setForm(f => ({ ...f, investmentNotes: e.target.value }))}
              placeholder="N° de operación, banco, sucursal, lo que te sirva tener registrado…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
          {deposit.investedIn && (
            <button onClick={clearInvestment} className="text-xs text-red-600 hover:text-red-700 font-medium">
              🗑 Quitar inversión
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary text-sm">
              {save.isPending ? 'Guardando…' : '💾 Guardar inversión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
