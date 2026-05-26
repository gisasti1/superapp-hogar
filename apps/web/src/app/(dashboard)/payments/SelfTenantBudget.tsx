'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billsApi, type BillItem } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useT } from '@/i18n';

const CATEGORY_ICON: Record<string, string> = {
  RENT: '🏠', EXPENSES: '🏢', ELECTRIC: '⚡', GAS: '🔥', WATER: '💧',
  ABL: '🏛️', INTERNET: '📡', CABLE: '📺', INSURANCE: '🛡️', OTHER: '📦',
};

const ALL_CATEGORIES = ['RENT','EXPENSES','ELECTRIC','GAS','WATER','ABL','INTERNET','CABLE','INSURANCE','OTHER'] as const;

const PAYMENT_METHODS = [
  { code: 'TRANSFER',    label: 'Transferencia',  icon: '🏦' },
  { code: 'MERCADOPAGO', label: 'Mercado Pago',   icon: '💸' },
  { code: 'CARD',        label: 'Tarjeta',         icon: '💳' },
  { code: 'AUTO_DEBIT',  label: 'Débito automático', icon: '⚡' },
  { code: 'CASH',        label: 'Efectivo',        icon: '💵' },
] as const;

function isFrozen(b: any): boolean {
  if (!b.frozenUntil) return false;
  return new Date(b.frozenUntil) > new Date();
}
function fmtMonthYear(d: string | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
}
function fmtMoney(n: number | string, currency = 'ARS') {
  return `$${Number(n).toLocaleString('es-AR')} ${currency}`;
}
function fmtPeriod(p: string) {
  const [y, m] = p.split('-').map(Number);
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[m - 1]} ${y}`;
}

export function SelfTenantBudget() {
  const t = useT();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn:  () => billsApi.list(),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ['bills-payments'],
    queryFn:  () => billsApi.listPayments(),
  });

  const seedMutation = useMutation({
    mutationFn: () => billsApi.seedFromRental(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['bills'] }),
    onError:    (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  const bills = data?.bills ?? [];
  const period = currentPeriod();
  const alreadyPaidThisMonth = (payments as any[]).some(p => p.period === period);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">{t('nav.payments')}</p>
        <h1 className="text-2xl font-extrabold">{t('bills.title')}</h1>
        <p className="mt-1 text-sm opacity-90 max-w-md">{t('bills.subtitle')}</p>
      </div>

      {/* Si no hay presupuesto cargado: CTA para pre-llenarlo */}
      {bills.length === 0 && (
        <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl p-8 text-center space-y-3">
          <p className="text-4xl">🧮</p>
          <h2 className="font-bold text-gray-900">{t('bills.title')}</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">{t('bills.subtitle')}</p>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="btn-primary"
          >
            {seedMutation.isPending ? '…' : '🪄 Crear presupuesto inicial'}
          </button>
          <p className="text-xs text-gray-400">Pre-cargo tu alquiler y dejo los servicios desactivados. Vos prendés los que pagás.</p>
        </div>
      )}

      {/* Presupuesto */}
      {bills.length > 0 && (
        <BudgetEditor
          bills={bills}
          period={period}
          alreadyPaid={alreadyPaidThisMonth}
          onChanged={() => qc.invalidateQueries({ queryKey: ['bills'] })}
          onPaidMonth={() => {
            qc.invalidateQueries({ queryKey: ['bills'] });
            qc.invalidateQueries({ queryKey: ['bills-payments'] });
          }}
        />
      )}

      {/* Historial */}
      <PaymentsHistory payments={payments as any[]} onDelete={() => qc.invalidateQueries({ queryKey: ['bills-payments'] })} />
    </div>
  );
}

/* ─── Editor del presupuesto + pago del mes ────────────────────────────── */
function BudgetEditor({
  bills, period, alreadyPaid, onChanged, onPaidMonth,
}: {
  bills: any[]; period: string; alreadyPaid: boolean;
  onChanged: () => void; onPaidMonth: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();

  // Override puntual del monto del mes (solo en memoria)
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [showAdd, setShowAdd]   = useState(false);

  const total = useMemo(() => {
    return bills
      .filter(b => b.isEnabled && !skip.has(b.id) && !isFrozen(b))
      .reduce((s, b) => s + (overrides[b.id] !== undefined ? overrides[b.id] : Number(b.amount)), 0);
  }, [bills, overrides, skip]);

  const currency = bills[0]?.currency ?? 'ARS';

  const toggleMutation = useMutation({
    mutationFn: (b: any) => billsApi.toggle(b.id, !b.isEnabled),
    onSuccess:  onChanged,
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => billsApi.remove(id),
    onSuccess:  onChanged,
  });
  const freezeMutation = useMutation({
    mutationFn: (v: { id: string; months: number }) => billsApi.freeze(v.id, { months: v.months }),
    onSuccess:  onChanged,
    onError:    (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });
  const freezeAllMutation = useMutation({
    mutationFn: (months: number) => billsApi.freezeAll({ months }),
    onSuccess:  onChanged,
    onError:    (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  const promptFreeze = (id: string) => {
    const ans = prompt('¿Cuántos meses querés congelar este concepto? (0 para descongelar)', '1');
    if (ans === null) return;
    const months = parseInt(ans, 10);
    if (Number.isNaN(months) || months < 0 || months > 24) return alert('Ingresá un número entre 0 y 24');
    freezeMutation.mutate({ id, months });
  };
  const promptFreezeAll = () => {
    const ans = prompt('Congelar TODOS los conceptos activos por X meses (ej: te vas de vacaciones). 0 = descongelar todo.', '1');
    if (ans === null) return;
    const months = parseInt(ans, 10);
    if (Number.isNaN(months) || months < 0 || months > 24) return alert('Ingresá un número entre 0 y 24');
    freezeAllMutation.mutate(months);
  };
  const payMutation = useMutation({
    mutationFn: () => billsApi.payMonth({
      period,
      paidAt: new Date().toISOString().slice(0,10),
      method: 'TRANSFER',
      overrides,
      skip: Array.from(skip),
    }),
    onSuccess: () => { setOverrides({}); setSkip(new Set()); onPaidMonth(); },
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Total bar */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 px-5 py-4 flex items-center justify-between gap-4 text-white flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-wider opacity-70">{fmtPeriod(period)}</p>
          <p className="font-extrabold text-2xl">{fmtMoney(total, currency)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={promptFreezeAll}
            className="shrink-0 bg-white/10 hover:bg-white/20 backdrop-blur text-white font-medium text-xs px-3 py-2 rounded-lg border border-white/20 transition"
            title="Congelar todos los conceptos por X meses"
          >
            ❄️ Congelar todo
          </button>
          <button
            onClick={() => payMutation.mutate()}
            disabled={alreadyPaid || total <= 0 || payMutation.isPending}
            className="shrink-0 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            {alreadyPaid ? '✓ ' + t('bills.alreadyPaid', { period: fmtPeriod(period) })
             : payMutation.isPending ? '…'
             : t('bills.payAllMonth')}
          </button>
        </div>
      </div>

      {/* Items list */}
      <ul className="divide-y divide-gray-100">
        {bills.map(b => {
          const overriddenAmount = overrides[b.id] !== undefined ? overrides[b.id] : Number(b.amount);
          const skipped = skip.has(b.id);
          const frozen  = isFrozen(b);
          const dimmed  = !b.isEnabled || skipped || frozen;
          const pm      = PAYMENT_METHODS.find(m => m.code === b.paymentMethod);
          return (
            <li key={b.id} className={`flex items-center gap-3 px-5 py-3 ${dimmed ? 'opacity-50' : ''}`}>
              {/* Toggle */}
              <button
                onClick={() => toggleMutation.mutate(b)}
                title={t('bills.toggle')}
                className={`shrink-0 w-10 h-6 rounded-full transition-colors relative ${b.isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${b.isEnabled ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-xl relative">
                {CATEGORY_ICON[b.category] ?? '📦'}
                {b.autoDebit && <span className="absolute -top-1 -right-1 text-[8px]" title="Débito automático">⚡</span>}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{b.label}</p>
                  {frozen && (
                    <span className="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide" title={`Congelado hasta ${fmtMonthYear(b.frozenUntil)}`}>
                      ❄️ hasta {fmtMonthYear(b.frozenUntil)}
                    </span>
                  )}
                  {b.autoDebit && !frozen && (
                    <span className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold uppercase">
                      ⚡ Auto
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  {t(`bills.category.${b.category}`)}
                  {b.dueDay && <> · vence día {b.dueDay}</>}
                  {pm && <> · {pm.icon} {pm.label}</>}
                  {b.notes && <> · {b.notes}</>}
                </p>
              </div>

              {/* Monto editable inline (override del mes) */}
              {b.isEnabled && !skipped && !frozen ? (
                <input
                  type="number"
                  min="0"
                  value={overriddenAmount}
                  onChange={e => setOverrides(o => ({ ...o, [b.id]: Number(e.target.value) }))}
                  className="w-28 text-right font-semibold text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
              ) : (
                <span className="w-28 text-right text-sm text-gray-400">—</span>
              )}

              {/* Freeze por item */}
              {b.isEnabled && (
                <button
                  onClick={() => promptFreeze(b.id)}
                  className={`text-xs ${frozen ? 'text-sky-600' : 'text-gray-400 hover:text-sky-600'}`}
                  title={frozen ? 'Descongelar' : 'Congelar X meses'}
                >❄️</button>
              )}
              {/* Skip puntual */}
              {b.isEnabled && !frozen && (
                <button
                  onClick={() => setSkip(s => { const n = new Set(s); n.has(b.id) ? n.delete(b.id) : n.add(b.id); return n; })}
                  className="text-xs text-gray-400 hover:text-amber-600"
                  title={skipped ? 'Volver a incluir este mes' : 'Excluir solo este mes'}
                >
                  {skipped ? '↩︎' : '⏭'}
                </button>
              )}
              <button onClick={() => setEditingBill(b)} className="text-gray-300 hover:text-indigo-600 text-sm">✏️</button>
              <button
                onClick={() => { if (confirm(`¿Borrar "${b.label}"?`)) removeMutation.mutate(b.id); }}
                className="text-gray-300 hover:text-red-500 text-sm"
              >🗑</button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
        <button onClick={() => setShowAdd(true)} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
          {t('bills.add')}
        </button>
        <p className="text-xs text-gray-400">Tocá el switch para activar/desactivar conceptos que el propietario te cubre.</p>
      </div>

      {/* Modal editar / agregar */}
      {(editingBill || showAdd) && (
        <BillFormModal
          initial={editingBill}
          onClose={() => { setEditingBill(null); setShowAdd(false); }}
          onSaved={() => { setEditingBill(null); setShowAdd(false); qc.invalidateQueries({ queryKey: ['bills'] }); }}
        />
      )}
    </div>
  );
}

/* ─── Modal de edición de un item ─────────────────────────────────────── */
function BillFormModal({ initial, onClose, onSaved }: { initial: any | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = useState({
    id:            initial?.id,
    category:      (initial?.category ?? 'OTHER') as BillItem['category'],
    label:         initial?.label ?? '',
    amount:        initial?.amount ? Number(initial.amount) : 0,
    currency:      initial?.currency ?? 'ARS',
    dueDay:        initial?.dueDay ?? 10,
    isEnabled:     initial?.isEnabled ?? true,
    notes:         initial?.notes ?? '',
    paymentMethod: initial?.paymentMethod ?? '',
    autoDebit:     initial?.autoDebit ?? false,
  });

  const save = useMutation({
    mutationFn: () => billsApi.upsert({
      ...form,
      amount: Number(form.amount),
      dueDay: Number(form.dueDay),
      paymentMethod: (form.paymentMethod || null) as any,
    }),
    onSuccess: onSaved,
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 text-lg">{initial ? '✏️ Editar concepto' : '+ Nuevo concepto'}</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}>
              {ALL_CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_ICON[c]} {t(`bills.category.${c}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('common.day')} venc.</label>
            <input className="input" type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: Number(e.target.value) }))} />
          </div>
        </div>

        <div>
          <label className="label">Nombre (cómo lo ves vos)</label>
          <input className="input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ej: EDESUR, Expensas Edif. Mitre…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Monto sugerido</label>
            <input className="input" type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">{t('common.currency')}</label>
            <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Medio de pago</label>
          <select
            className="input"
            value={form.paymentMethod}
            onChange={e => {
              const v = e.target.value;
              setForm(f => ({ ...f, paymentMethod: v, autoDebit: v === 'AUTO_DEBIT' ? true : f.autoDebit }));
            }}
          >
            <option value="">— Sin definir —</option>
            {PAYMENT_METHODS.map(m => (
              <option key={m.code} value={m.code}>{m.icon} {m.label}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-violet-600"
            checked={form.autoDebit}
            onChange={e => setForm(f => ({ ...f, autoDebit: e.target.checked }))}
          />
          <span className="text-sm text-gray-700">
            ⚡ <strong>Débito automático</strong> — se cobra solo, no me hace falta marcar como pagado cada mes
          </span>
        </label>

        <div>
          <label className="label">{t('common.note')} ({t('common.optional')})</label>
          <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej: incluye iluminación común" />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary text-sm">{t('common.cancel')}</button>
          <button onClick={() => save.mutate()} disabled={!form.label.trim() || save.isPending} className="btn-primary text-sm">
            {save.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Historial ────────────────────────────────────────────────────────── */
function PaymentsHistory({ payments, onDelete }: { payments: any[]; onDelete: () => void }) {
  const t = useT();
  const [expanded, setExpanded] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => billsApi.deletePayment(id),
    onSuccess:  onDelete,
  });

  if (payments.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-bold text-gray-900 mb-3">{t('bills.history')}</h2>
      <ul className="divide-y divide-gray-100">
        {payments.map(p => {
          const isOpen = expanded === p.id;
          return (
            <li key={p.id} className="py-3">
              <button onClick={() => setExpanded(isOpen ? null : p.id)} className="w-full flex items-center gap-3 text-left">
                <span className={`transform transition ${isOpen ? 'rotate-90' : ''}`}>▸</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{fmtPeriod(p.period)}</p>
                  <p className="text-[11px] text-gray-400">{new Date(p.paidAt).toLocaleDateString('es-AR')} · {p.method ?? '—'}</p>
                </div>
                <span className="font-bold text-gray-900 text-sm">{fmtMoney(p.total, p.currency)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`¿Borrar pago de ${fmtPeriod(p.period)}?`)) remove.mutate(p.id); }}
                  className="text-gray-300 hover:text-red-500"
                >🗑</button>
              </button>
              {isOpen && Array.isArray(p.breakdown) && (
                <ul className="mt-2 ml-8 space-y-1 text-xs text-gray-600">
                  {p.breakdown.map((b: any, i: number) => (
                    <li key={i} className="flex justify-between">
                      <span>{CATEGORY_ICON[b.category] ?? '📦'} {b.label}</span>
                      <span className="font-mono">{fmtMoney(b.amount, p.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
