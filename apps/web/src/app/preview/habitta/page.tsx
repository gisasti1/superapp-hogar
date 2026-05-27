'use client';

/**
 * PREVIEW del rebrand a Habitta — público, sin login.
 * Acá mostramos cómo se vería la app con la paleta nueva.
 * El código existente queda intacto.
 *
 * URL: /preview/habitta
 */

import { HabittaLogo } from '@/components/HabittaLogo';

export default function HabittaPreviewPage() {
  return (
    <div className="min-h-screen bg-habitta-cream">

      {/* ─── Top brand bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-habitta-cream/85 backdrop-blur border-b border-habitta-sand">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <HabittaLogo size={32} />
          <nav className="hidden sm:flex items-center gap-5 text-sm font-medium text-habitta-charcoal">
            <a href="#dashboard"  className="hover:text-habitta-terra transition">Dashboard</a>
            <a href="#listings"   className="hover:text-habitta-terra transition">Inmuebles</a>
            <a href="#contract"   className="hover:text-habitta-terra transition">Contratos</a>
            <a href="#receipts"   className="hover:text-habitta-terra transition">Comprobantes</a>
          </nav>
          <button className="text-xs font-semibold text-habitta-cream bg-habitta-terra hover:bg-habitta-earth px-4 py-2 rounded-full transition">
            Iniciar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-16">

        {/* ─── HERO ─────────────────────────────────────────────────── */}
        <section className="text-center space-y-4">
          <HabittaLogo size={72} tagline />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-habitta-deep tracking-tight max-w-3xl mx-auto leading-tight">
            Alquilá fácil. <span className="text-habitta-terra">Viví tranquilo.</span>
          </h1>
          <p className="text-habitta-charcoal/80 max-w-xl mx-auto">
            La plataforma argentina que junta inquilinos, propietarios, inmobiliarias y prestadores de servicios del hogar. Todo en un solo lugar.
          </p>
          <div className="flex gap-3 justify-center pt-2 flex-wrap">
            <button className="bg-habitta-terra hover:bg-habitta-earth text-habitta-cream font-semibold px-6 py-3 rounded-full transition shadow-sm">
              Empezá gratis
            </button>
            <button className="bg-habitta-cream text-habitta-deep font-semibold px-6 py-3 rounded-full border border-habitta-olive/40 hover:bg-habitta-sand transition">
              Ver demo
            </button>
          </div>
        </section>

        {/* ─── DASHBOARD MOCK ───────────────────────────────────────── */}
        <section id="dashboard" className="space-y-3">
          <SectionLabel>Pantalla de inicio</SectionLabel>

          <div className="grid md:grid-cols-2 gap-5">

            {/* Tarjeta de bienvenida + accesos rápidos */}
            <div className="bg-habitta-sand/70 rounded-3xl p-6 space-y-5">
              <div>
                <p className="text-2xl font-extrabold text-habitta-deep leading-tight">¡Hola, Juan!</p>
                <p className="text-2xl font-extrabold text-habitta-deep leading-tight">¿Qué necesitás hoy?</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <QuickTile icon="🛡️" label="Seguro de caución" />
                <QuickTile icon="📄" label="Contratos digitales" />
                <QuickTile icon="📅" label="Pagos y vencimientos" />
                <QuickTile icon="🔧" label="Servicios del hogar" />
              </div>

              <button className="w-full bg-habitta-cream rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition border border-habitta-olive/20">
                <div className="w-10 h-10 rounded-xl bg-habitta-eucalyptus/15 flex items-center justify-center text-habitta-eucalyptus text-lg">⚖️</div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-habitta-deep text-sm">Asesoría legal</p>
                  <p className="text-xs text-habitta-charcoal/60">Consultá ahora</p>
                </div>
                <span className="text-habitta-stone">›</span>
              </button>
            </div>

            {/* Card "alquilá fácil" con imagen + próximo pago */}
            <div className="rounded-3xl overflow-hidden flex flex-col bg-habitta-cream border border-habitta-sand">
              {/* "Imagen" simulada con gradiente cálido */}
              <div className="relative h-44 bg-gradient-to-br from-habitta-beige via-habitta-sand to-habitta-eucalyptus/30 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xl font-extrabold text-habitta-deep leading-tight">Alquilá fácil.</p>
                  <p className="text-xl font-extrabold text-habitta-deep leading-tight">Viví tranquilo.</p>
                </div>
                <div className="self-end opacity-60 text-4xl">🪴</div>
                <div className="absolute right-6 top-6 w-6 h-6 rounded-full bg-habitta-terra/80 shadow" />
              </div>
              <div className="p-5 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-habitta-stone">Próximo pago</p>
                  <p className="text-2xl font-extrabold text-habitta-deep">$ 820.000</p>
                  <p className="text-xs text-habitta-stone">Vence 05/06/2026</p>
                </div>
                <button className="w-11 h-11 rounded-full bg-habitta-sand text-habitta-deep flex items-center justify-center hover:bg-habitta-beige transition">
                  🔔
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── EJEMPLO DE PANTALLA: detalle de contrato ─────────────── */}
        <section id="contract" className="space-y-3">
          <SectionLabel>Pantalla de contrato</SectionLabel>

          <div className="bg-habitta-cream border border-habitta-sand rounded-3xl overflow-hidden">
            <div className="bg-habitta-deep text-habitta-cream px-6 py-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-60">Contrato N°</p>
                <p className="font-extrabold text-xl">C-2026-0042</p>
              </div>
              <span className="text-[10px] font-bold uppercase bg-habitta-eucalyptus text-habitta-cream px-3 py-1 rounded-full">
                ✓ Firmado
              </span>
            </div>

            <div className="p-6 grid sm:grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Inmueble"   value="Gorriti 4321, Piso 2 — CABA" />
              <Field label="Inicio"     value="01 / 01 / 2026" />
              <Field label="Inquilino"  value="Juan Pérez · DNI 32.123.456" />
              <Field label="Propietario"value="Carlos Romero · DNI 25.987.654" />
              <Field label="Monto mensual" value="$ 480.000 ARS" highlight />
              <Field label="Fin del contrato" value="01 / 01 / 2029" />
            </div>

            <div className="border-t border-habitta-sand p-6 flex flex-wrap gap-3">
              <button className="bg-habitta-terra hover:bg-habitta-earth text-habitta-cream font-semibold text-sm px-4 py-2 rounded-full transition">
                📄 Descargar PDF
              </button>
              <button className="bg-habitta-cream text-habitta-deep font-semibold text-sm px-4 py-2 rounded-full border border-habitta-olive/40 hover:bg-habitta-sand transition">
                💬 Chatear con propietario
              </button>
              <button className="bg-habitta-cream text-habitta-deep font-semibold text-sm px-4 py-2 rounded-full border border-habitta-olive/40 hover:bg-habitta-sand transition">
                👥 Co-firmantes
              </button>
            </div>
          </div>
        </section>

        {/* ─── EJEMPLO: comprobantes ────────────────────────────────── */}
        <section id="receipts" className="space-y-3">
          <SectionLabel>Lista de comprobantes</SectionLabel>

          <div className="space-y-3">
            <ReceiptRow icon="🏠" type="Pago de contrato"        amount="$ 480.000" partner="A Carlos Romero" date="10/05/2026" method="Mercado Pago" />
            <ReceiptRow icon="🔧" type="Servicio plomería"        amount="$ 32.500"  partner="A Pedro Gas"     date="08/05/2026" method="Transferencia" />
            <ReceiptRow icon="💸" type="Presupuesto mensual"       amount="$ 621.000" partner=""                date="01/05/2026" method="Auto-débito" />
          </div>
        </section>

        {/* ─── PALETA ──────────────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionLabel>Paleta aplicada</SectionLabel>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 bg-habitta-cream p-4 rounded-2xl border border-habitta-sand">
            {COLORS.map(c => (
              <div key={c.hex} className="text-center">
                <div className="aspect-square rounded-xl shadow-inner mb-1.5" style={{ background: c.hex }} />
                <p className="text-[10px] font-bold text-habitta-deep">{c.name}</p>
                <p className="text-[9px] font-mono text-habitta-stone">{c.hex}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SENSACIONES ─────────────────────────────────────────── */}
        <section className="text-center space-y-4 pb-6">
          <SectionLabel center>Sensación de marca</SectionLabel>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-habitta-deep">
            <Feel icon="☀️" label="Cálida"      />
            <Feel icon="🛡️" label="Confiable"  />
            <Feel icon="⚖️" label="Equilibrada" />
            <Feel icon="✦"  label="Moderna"    />
            <Feel icon="👥" label="Cercana"    />
          </div>
        </section>

        {/* ─── CTA ─────────────────────────────────────────────────── */}
        <div className="text-center pt-4 pb-12 border-t border-habitta-sand">
          <p className="text-habitta-stone text-sm mb-3">¿Aprobás el rebrand?</p>
          <p className="text-habitta-charcoal text-xs max-w-md mx-auto">
            Si te gusta, decime "dale" y aplico la paleta + nombre + logo a TODA la app.
            Hoy esto convive sin afectar nada de SuperApp Hogar.
          </p>
        </div>

      </main>
    </div>
  );
}

/* ─── Building blocks ─────────────────────────────────────────────────── */

function SectionLabel({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] text-habitta-stone ${center ? 'text-center' : ''}`}>
      {children}
    </p>
  );
}

function QuickTile({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="bg-habitta-cream rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 hover:shadow-sm transition border border-habitta-olive/20 aspect-square">
      <div className="w-10 h-10 rounded-xl bg-habitta-beige/40 flex items-center justify-center text-lg">{icon}</div>
      <p className="text-[11px] font-semibold text-habitta-deep leading-tight">{label}</p>
    </button>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-habitta-stone">{label}</p>
      <p className={`mt-1 font-semibold ${highlight ? 'text-habitta-terra text-lg' : 'text-habitta-deep text-sm'}`}>{value}</p>
    </div>
  );
}

function ReceiptRow({ icon, type, amount, partner, date, method }: {
  icon: string; type: string; amount: string; partner: string; date: string; method: string;
}) {
  return (
    <div className="bg-habitta-cream rounded-2xl border border-habitta-sand p-4 sm:p-5 flex items-center gap-4">
      <div className="text-3xl shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-habitta-stone">{type}</p>
        <p className="text-lg font-extrabold text-habitta-deep">{amount}</p>
        <p className="text-xs text-habitta-charcoal/70">{partner ? `${partner} · ` : ''}{date} · {method}</p>
      </div>
      <button className="text-xs font-semibold bg-habitta-terra hover:bg-habitta-earth text-habitta-cream px-3 py-1.5 rounded-full transition">
        Descargar
      </button>
    </div>
  );
}

function Feel({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-7 h-7 rounded-full bg-habitta-sand flex items-center justify-center text-habitta-terra">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

const COLORS = [
  { name: 'Marrón',   hex: '#4B3F35' },
  { name: 'Tierra',   hex: '#8C6B4E' },
  { name: 'Oliva',    hex: '#A4977A' },
  { name: 'Arena',    hex: '#EDE6D9' },
  { name: 'Piedra',   hex: '#B5ADA1' },
  { name: 'Crema',    hex: '#F7F3EE' },
  { name: 'Beige',    hex: '#E2C9A6' },
  { name: 'Terracota',hex: '#C98E5B' },
  { name: 'Eucalipto',hex: '#7E9081' },
  { name: 'Carbón',   hex: '#5A5147' },
];
