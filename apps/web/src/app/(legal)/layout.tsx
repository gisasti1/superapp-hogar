import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-600">habitta</Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Volver al login</Link>
        </div>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-sm">
        {children}
      </article>
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 habitta</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-600">Privacidad</Link>
            <Link href="/terms" className="hover:text-gray-600">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
