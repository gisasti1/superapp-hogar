import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-4">🏚️</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-lg text-gray-600 mb-1">Esta página no existe.</p>
        <p className="text-sm text-gray-400 mb-8">
          Quizás te equivocaste de URL o la página fue movida.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn-primary">
            Ir al inicio
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Mi panel
          </Link>
        </div>
      </div>
    </div>
  );
}
