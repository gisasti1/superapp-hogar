'use client';

import { useState, useEffect, Suspense as _Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Cast por el doble @types/react que rompe el JSX type checking de Suspense.
const Suspense = _Suspense as any;
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { myRentalApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function fmtMoney(n: number | string | null | undefined, currency = 'ARS') {
  if (n === null || n === undefined) return '—';
  return `$${Number(n).toLocaleString('es-AR')} ${currency}`;
}
function fmtDate(s: string | Date | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-AR');
}
function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function fmtPeriod(p: string) {
  // "2026-05" → "Mayo 2026"
  const [y, m] = p.split('-').map(Number);
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[m - 1]} ${y}`;
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function MyRentalPage() {
  return (
    <Suspense fallback={null}>
      <MyRentalPageInner />
    </Suspense>
  );
}

function MyRentalPageInner() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const isWelcome = params.get('welcome') === '1';

  const { data: rental, isLoading } = useQuery({
    queryKey: ['my-rental'],
    queryFn: () => myRentalApi.get(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['my-rental-payments'],
    queryFn: () => myRentalApi.listPayments(),
    enabled: !!rental,
  });

  const [editing, setEditing] = useState(false);
  // Si no hay contrato, abrir el editor solo
  useEffect(() => {
    if (!isLoading && !rental) setEditing(true);
  }, [isLoading, rental]);

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Welcome banner */}
      {isWelcome && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800">
          <p className="font-bold">¡Bienvenido a Habitta! 🎉</p>
          <p className="text-sm mt-1">
            Cargá los datos de tu alquiler actual abajo y vas a poder registrar tus pagos mensuales, guardar comprobantes y pedir servicios para el hogar cuando los necesites.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0, transparent 40%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Mi alquiler</p>
          <h1 className="text-2xl font-extrabold">Contrato externo y pagos</h1>
          <p className="mt-1 text-sm opacity-90 max-w-md">
            Llevá la bitácora de tu alquiler — datos del propietario, monto, vencimientos y cada pago hecho.
          </p>
        </div>
      </div>

      {/* Resumen del contrato */}
      {rental && !editing && (
        <RentalSummary rental={rental} onEdit={() => setEditing(true)} />
      )}

      {/* Editor (cuando no hay contrato o se está editando) */}
      {editing && (
        <RentalEditor
          initial={rental}
          onCancel={() => rental && setEditing(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['my-rental'] });
            setEditing(false);
          }}
        />
      )}

      {/* Pagos */}
      {rental && !editing && (
        <PaymentsSection rental={rental} payments={payments as any[]} />
      )}
    </div>
  );
}

/* ─── Summary card ─────────────────────────────────────────────────────── */
function RentalSummary({ rental, onEdit }: { rental: any; onEdit: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Inmueble</p>
          <h2 className="text-lg font-bold text-gray-900">{rental.address}</h2>
          <p className="text-sm text-gray-500">{rental.city}{rental.province ? `, ${rental.province}` : ''}</p>
        </div>
        <button onClick={onEdit} className="text-xs font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
          ✏️ Editar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Monto mensual" value={fmtMoney(rental.monthlyAmount, rental.currency)} accent="rose" />
        <Stat label="Vence el" value={`Día ${rental.dueDay} del mes`} />
        <Stat label="Inicio" value={fmtDate(rental.startDate)} />
        <Stat label="Fin" value={fmtDate(rental.endDate)} />
      </div>

      <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Propietario / contraparte</p>
          <p className="font-medium text-gray-900">{rental.landlordName}</p>
          {rental.landlordPhone && <p className="text-gray-500 text-xs">📱 {rental.landlordPhone}</p>}
          {rental.landlordEmail && <p className="text-gray-500 text-xs">✉️ {rental.landlordEmail}</p>}
          {rental.landlordCbu && <p className="text-gray-500 text-xs font-mono">CBU: {rental.landlordCbu}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Depósito / notas</p>
          {rental.depositAmount && (
            <p className="text-gray-700">Depósito: <strong>{fmtMoney(rental.depositAmount, rental.currency)}</strong></p>
          )}
          {rental.notes && <p className="text-gray-500 text-xs italic">{rental.notes}</p>}
          {!rental.depositAmount && !rental.notes && <p className="text-gray-400 text-xs">Sin datos adicionales</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'rose' }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 font-bold ${accent === 'rose' ? 'text-rose-600' : 'text-gray-900'} text-sm leading-tight`}>{value}</p>
    </div>
  );
}

/* ─── Editor (upsert) ──────────────────────────────────────────────────── */
function RentalEditor({ initial, onCancel, onSaved }: { initial: any | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    landlordName:  initial?.landlordName  ?? '',
    landlordPhone: initial?.landlordPhone ?? '',
    landlordEmail: initial?.landlordEmail ?? '',
    landlordCbu:   initial?.landlordCbu   ?? '',
    address:       initial?.address       ?? '',
    city:          initial?.city          ?? '',
    province:      initial?.province      ?? '',
    monthlyAmount: initial?.monthlyAmount ? Number(initial.monthlyAmount) : 0,
    currency:      initial?.currency      ?? 'ARS',
    depositAmount: initial?.depositAmount ? Number(initial.depositAmount) : 0,
    dueDay:        initial?.dueDay        ?? 10,
    startDate:     initial?.startDate     ? new Date(initial.startDate).toISOString().slice(0,10) : '',
    endDate:       initial?.endDate       ? new Date(initial.endDate).toISOString().slice(0,10)   : '',
    notes:         initial?.notes         ?? '',
  });

  const mutation = useMutation({
    mutationFn: () => myRentalApi.upsert({
      ...form,
      monthlyAmount: Number(form.monthlyAmount),
      depositAmount: form.depositAmount ? Number(form.depositAmount) : undefined,
      dueDay:        Number(form.dueDay),
    }),
    onSuccess: onSaved,
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error al guardar'),
  });

  const set = (k: keyof typeof form) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 space-y-5">
      <h2 className="font-bold text-gray-900 text-lg">{initial ? 'Editar contrato externo' : 'Cargá los datos de tu alquiler'}</h2>

      {/* Inmueble */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Inmueble</p>
        <div>
          <label className="label">Dirección *</label>
          <input className="input" value={form.address} onChange={set('address')} placeholder="Av. Corrientes 1234, Piso 3 Dto B" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ciudad *</label>
            <input className="input" value={form.city} onChange={set('city')} placeholder="Buenos Aires" required />
          </div>
          <div>
            <label className="label">Provincia</label>
            <input className="input" value={form.province} onChange={set('province')} placeholder="Buenos Aires" />
          </div>
        </div>
      </section>

      {/* Contraparte */}
      <section className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Propietario / contraparte</p>
        <div>
          <label className="label">Nombre y apellido *</label>
          <input className="input" value={form.landlordName} onChange={set('landlordName')} placeholder="Juan Pérez" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.landlordPhone} onChange={set('landlordPhone')} placeholder="+54 11 1234-5678" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.landlordEmail} onChange={set('landlordEmail')} placeholder="juan@email.com" type="email" />
          </div>
        </div>
        <div>
          <label className="label">CBU / Alias (para transferencias)</label>
          <input className="input font-mono text-xs" value={form.landlordCbu} onChange={set('landlordCbu')} placeholder="0000003100012345678901 o juan.perez.mp" />
        </div>
      </section>

      {/* Condiciones */}
      <section className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Condiciones</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Monto mensual *</label>
            <input className="input" type="number" min="0" value={form.monthlyAmount} onChange={set('monthlyAmount')} required />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select className="input" value={form.currency} onChange={set('currency')}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Depósito (opcional)</label>
            <input className="input" type="number" min="0" value={form.depositAmount} onChange={set('depositAmount')} />
          </div>
          <div>
            <label className="label">Día de vencimiento (1-28)</label>
            <input className="input" type="number" min="1" max="28" value={form.dueDay} onChange={set('dueDay')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fecha inicio *</label>
            <input className="input" type="date" value={form.startDate} onChange={set('startDate')} required />
          </div>
          <div>
            <label className="label">Fecha fin *</label>
            <input className="input" type="date" value={form.endDate} onChange={set('endDate')} required />
          </div>
        </div>
        <div>
          <label className="label">Notas (opcional)</label>
          <textarea className="input min-h-[60px]" value={form.notes} onChange={set('notes')} placeholder="Ej: expensas extra, garantes, observaciones…" />
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        {initial && <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>}
        <button type="submit" disabled={mutation.isPending} className="btn-primary text-sm">
          {mutation.isPending ? 'Guardando…' : (initial ? 'Guardar cambios' : 'Guardar contrato')}
        </button>
      </div>
    </form>
  );
}

/* ─── Pagos section ────────────────────────────────────────────────────── */
function PaymentsSection({ rental, payments }: { rental: any; payments: any[] }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const period = currentPeriod();
  const alreadyPaid = payments.some(p => p.period === period);

  const [form, setForm] = useState({
    period,
    amount: Number(rental.monthlyAmount),
    paidAt: new Date().toISOString().slice(0,10),
    method: 'TRANSFER' as 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'OTHER',
    note: '',
  });

  const create = useMutation({
    mutationFn: () => myRentalApi.registerPayment({
      ...form,
      amount: Number(form.amount),
      currency: rental.currency,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-rental-payments'] });
      setShowForm(false);
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error al registrar el pago'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => myRentalApi.deletePayment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-rental-payments'] }),
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Pagos registrados</h2>
          <p className="text-xs text-gray-500">
            {alreadyPaid
              ? `✓ Ya registraste el pago de ${fmtPeriod(period)}`
              : `⚠️ Falta registrar el pago de ${fmtPeriod(period)}`}
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + Registrar pago
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Período</label>
              <input className="input" type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Monto</label>
              <input className="input" type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha del pago</label>
              <input className="input" type="date" value={form.paidAt} onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Método</label>
              <select className="input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as any }))}>
                <option value="TRANSFER">Transferencia</option>
                <option value="MERCADOPAGO">Mercado Pago</option>
                <option value="CASH">Efectivo</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Nota (opcional)</label>
            <input className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Ej: incluye expensas" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="btn-primary text-sm">
              {create.isPending ? 'Guardando…' : 'Guardar pago'}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {payments.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <p className="text-3xl mb-2">💸</p>
          <p className="text-sm">Todavía no registraste ningún pago.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{fmtPeriod(p.period)}</p>
                <p className="text-xs text-gray-500">
                  {fmtDate(p.paidAt)} · {p.method} {p.note ? `· ${p.note}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900 text-sm">{fmtMoney(p.amount, p.currency)}</span>
                <button
                  onClick={() => { if (confirm(`¿Borrar pago de ${fmtPeriod(p.period)}?`)) remove.mutate(p.id); }}
                  className="text-gray-300 hover:text-red-500 text-sm"
                  title="Borrar pago"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
