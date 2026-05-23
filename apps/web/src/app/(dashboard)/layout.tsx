'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { NotificationsBell } from '@/components/NotificationsBell';
import { clsx } from 'clsx';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/contracts', label: 'Contratos', icon: '📄' },
  { href: '/payments', label: 'Pagos', icon: '💳' },
  { href: '/mediation', label: 'Mediación', icon: '⭐' },
  { href: '/insurance', label: 'Seguro', icon: '🛡️' },
  { href: '/listings', label: 'Inmuebles', icon: '🏘️' },
  { href: '/premium', label: 'Premium', icon: '👑' },
  { href: '/profile', label: 'Perfil', icon: '👤' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const clearAuth = useAuthStore(s => s.clearAuth);

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <span className="font-bold text-brand-600 text-lg">SuperApp Hogar</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-end px-6 gap-2">
          <NotificationsBell />
        </header>
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
