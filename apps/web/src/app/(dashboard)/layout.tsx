'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { NotificationsBell } from '@/components/NotificationsBell';
import { clsx } from 'clsx';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/listings', label: 'Inmuebles', icon: '🏘️' },
  { href: '/favorites', label: 'Favoritos', icon: '❤️' },
  { href: '/rental-requests', label: 'Solicitudes', icon: '📨' },
  { href: '/contracts', label: 'Contratos', icon: '📄' },
  { href: '/payments', label: 'Pagos', icon: '💳' },
  { href: '/issues', label: 'Desperfectos', icon: '🛠' },
  { href: '/messages', label: 'Mensajes', icon: '💬' },
  { href: '/mediation', label: 'Mediación', icon: '⭐' },
  { href: '/insurance', label: 'Seguro', icon: '🛡️' },
  { href: '/premium', label: 'Premium', icon: '👑' },
  { href: '/profile', label: 'Perfil', icon: '👤' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const clearAuth = useAuthStore(s => s.clearAuth);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cerrar el menú al cambiar de ruta (UX en mobile)
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  // Contenido del sidebar (reutilizado en desktop y drawer mobile)
  const sidebarContent = (
    <>
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <span className="font-bold text-brand-600 text-lg">SuperApp Hogar</span>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
            <span className="text-base">{item.icon}</span>
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
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* ─── Sidebar DESKTOP (visible >= lg) ────────────────────── */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-white border-r border-gray-100">
        {sidebarContent}
      </aside>

      {/* ─── Drawer MOBILE (visible cuando drawerOpen) ──────────── */}
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity',
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white z-50 lg:hidden flex flex-col shadow-xl transition-transform',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* ─── Main content ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:overflow-hidden">
        {/* Header con hamburguesa en mobile */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white border-b border-gray-100 flex items-center justify-between lg:justify-end px-4 lg:px-6 gap-2">
          {/* Hamburguesa — sólo mobile */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
            aria-label="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {/* Logo mobile centrado */}
          <span className="lg:hidden font-bold text-brand-600 text-base">SuperApp Hogar</span>
          <NotificationsBell />
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
