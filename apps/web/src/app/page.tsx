import Link from 'next/link';

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
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-brand-600">SuperApp Hogar</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Ingresar
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Alquilá sin estrés.<br />
          <span className="text-brand-600">Todo en un lugar.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Seguro de caución, contrato digital, pagos automáticos y mediación con IA.
          Para inquilinos, propietarios e inmobiliarias.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
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
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Todo lo que necesitás para alquilar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map(f => (
            <div key={f.title} className="card hover:shadow-md transition-shadow">
              <span className="text-4xl mb-4 block">{f.icon}</span>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Empezá hoy. Es gratis.
          </h2>
          <p className="text-brand-100 mb-8">
            Creá tu cuenta en 2 minutos y accedé a seguro de caución, contrato digital y más.
          </p>
          <Link href="/register" className="bg-white text-brand-600 font-bold px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors">
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span>© 2026 SuperApp Hogar. Todos los derechos reservados.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-gray-600">Privacidad</Link>
            <Link href="/terms" className="hover:text-gray-600">Términos</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
