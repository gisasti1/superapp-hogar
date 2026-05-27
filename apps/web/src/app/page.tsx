import Link from 'next/link';
import { HabittaLogo } from '@/components/HabittaLogo';

const FEATURES = [
  { icon: '🛡️', title: 'Seguro de caución', desc: 'Reemplazá la fianza en efectivo por una póliza. Cotizá en 2 minutos.' },
  { icon: '✍️', title: 'Contrato digital', desc: 'Firmá tu contrato de locación con validez legal desde el celular.' },
  { icon: '💰', title: 'Pagos automáticos', desc: 'El alquiler se cobra y acredita automáticamente cada mes.' },
  { icon: '⭐', title: 'Mediación con IA', desc: 'Resolvemos conflictos en 72hs con jurisprudencia argentina real.' },
  { icon: '🏦', title: 'Fianza con rendimiento', desc: 'Tu depósito en garantía genera intereses mientras está en custodia.' },
  { icon: '🔧', title: 'Servicios del hogar', desc: 'Plomeros, electricistas y más, verificados y con pago integrado.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-habitta-cream">
      {/* Nav */}
      <nav className="border-b border-habitta-sand bg-habitta-cream/85 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <HabittaLogo size={28} color="#C98E5B" accentColor="#7E9081" />
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-habitta-charcoal hover:text-habitta-terra transition">
              Ingresar
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center overflow-hidden">
        {/* Blobs decorativos sutiles detrás del hero */}
        <div className="absolute -top-10 -left-10 w-80 h-80 rounded-full bg-habitta-beige/30 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-20 -right-10 w-96 h-96 rounded-full bg-habitta-eucalyptus/20 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-habitta-terra/10 blur-3xl pointer-events-none" aria-hidden="true" />

        {/* Logo con sello al lado */}
        <div className="relative mb-8 inline-flex items-center gap-4">
          <HabittaLogo
            size={84}
            color="#C98E5B"
            textColor="#4B3F35"
            accentColor="#7E9081"
            tagline
            noLink
          />
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-habitta-cream border border-habitta-eucalyptus/30 text-habitta-eucalyptus text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
            🇦🇷 Hecho en Argentina
          </span>
        </div>

        <h1 className="relative text-5xl sm:text-6xl font-extrabold text-habitta-deep leading-tight mb-6 max-w-3xl mx-auto tracking-tight">
          Alquilá fácil.<br />
          <span className="text-habitta-terra">Viví tranquilo.</span>
        </h1>
        <p className="relative text-lg sm:text-xl text-habitta-charcoal/80 max-w-2xl mx-auto mb-10 leading-relaxed">
          Seguro de caución, contrato digital, pagos automáticos, comprobantes y mediación con IA.
          Para inquilinos, propietarios, inmobiliarias y prestadores de servicios.
        </p>
        <div className="relative flex gap-3 justify-center flex-wrap">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            Empezar gratis
          </Link>
          <a href="#features" className="btn-secondary px-8 py-3 text-base">
            Ver funciones
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-habitta-stone mb-3">Funciones</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-habitta-deep mb-12">
          Todo lo que necesitás para alquilar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-habitta-cream border border-habitta-sand rounded-2xl p-6 hover:shadow-md hover:border-habitta-olive/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-habitta-beige/40 flex items-center justify-center text-2xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-habitta-deep mb-2">{f.title}</h3>
              <p className="text-habitta-charcoal/70 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — fondo marrón profundo */}
      <section className="bg-habitta-deep py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-habitta-cream mb-4">
            Empezá hoy. Es gratis.
          </h2>
          <p className="text-habitta-cream/80 mb-8 max-w-xl mx-auto">
            Creá tu cuenta en 2 minutos y accedé a seguro de caución, contrato digital,
            comprobantes y todo lo que tu hogar necesita.
          </p>
          <Link href="/register" className="inline-flex items-center bg-habitta-terra hover:bg-habitta-earth text-habitta-cream font-bold px-8 py-3 rounded-full transition-colors shadow-sm">
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-habitta-sand py-8 bg-habitta-cream">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-habitta-stone">
          <span>© 2026 Habitta. Todos los derechos reservados.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-habitta-terra transition">Privacidad</Link>
            <Link href="/terms"   className="hover:text-habitta-terra transition">Términos</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
