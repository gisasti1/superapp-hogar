'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { NotificationsBell } from '@/components/NotificationsBell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HabittaLogo } from '@/components/HabittaLogo';
import { useT } from '@/i18n';
import { clsx } from 'clsx';

// Nav items con key de i18n en vez de label hardcodeado.
// Resolvemos el label en runtime con useT().
const NAV_BASE = [
  { href: '/dashboard',  k: 'nav.home',      icon: '🏠' },
  { href: '/listings',   k: 'nav.listings',  icon: '🏘️' },
  { href: '/favorites',  k: 'nav.favorites', icon: '❤️' },
  { href: '/messages',   k: 'nav.messages',  icon: '💬' },
  { href: '/support',    k: 'nav.support',   icon: '✉️' },
  { href: '/profile',    k: 'nav.profile',   icon: '👤' },
];

const NAV_TENANT_LANDLORD = [
  { href: '/rental-requests',     k: 'nav.rentalRequests', icon: '📨' },
  { href: '/visits',              k: 'nav.visits',         icon: '📅' },
  { href: '/contracts',           k: 'nav.contracts',      icon: '📄' },
  { href: '/contracts/templates', k: 'nav.templates',      icon: '📋' },
  { href: '/payments',            k: 'nav.payments',       icon: '💳' },
  { href: '/receipts',            k: 'nav.receipts',       icon: '🧾' },
  { href: '/issues',              k: 'nav.issues',         icon: '🛠' },
  { href: '/services',            k: 'nav.services',       icon: '🔧' },
  { href: '/mediation',           k: 'nav.mediation',      icon: '⭐' },
  { href: '/insurance',           k: 'nav.insurance',      icon: '🛡️' },
  { href: '/premium',             k: 'nav.premium',        icon: '👑' },
];

const NAV_PROVIDER = [
  { href: '/provider',          k: 'nav.myProfile',  icon: '🛠️' },
  { href: '/services/bookings', k: 'nav.myBookings', icon: '📋' },
  { href: '/services',          k: 'nav.explore',    icon: '🔧' },
  { href: '/payments',          k: 'nav.payments',   icon: '💳' },
  { href: '/premium',           k: 'nav.premium',    icon: '👑' },
];

const NAV_REALTOR = [
  { href: '/realtor',   k: 'nav.myAgency',   icon: '🏛️' },
  { href: '/listings',  k: 'nav.properties', icon: '🏘️' },
  { href: '/contracts', k: 'nav.contracts',  icon: '📄' },
  { href: '/payments',  k: 'nav.payments',   icon: '💳' },
  { href: '/premium',   k: 'nav.plan',       icon: '👑' },
];

const NAV_SELF_TENANT = [
  { href: '/dashboard', k: 'nav.home',      icon: '🏠' },
  { href: '/my-rental', k: 'nav.myRental',  icon: '📄' },
  { href: '/payments',  k: 'nav.payments',  icon: '💳' },
  { href: '/receipts',  k: 'nav.receipts',  icon: '🧾' },
  { href: '/services',  k: 'nav.services',  icon: '🔧' },
  { href: '/issues',    k: 'nav.issues',    icon: '🛠' },
  { href: '/messages',  k: 'nav.messages',  icon: '💬' },
  { href: '/support',   k: 'nav.support',   icon: '✉️' },
  { href: '/profile',   k: 'nav.profile',   icon: '👤' },
];

const ADMIN_NAV = [
  { href: '/admin',         k: 'nav.adminPanel', icon: '🛡️' },
  { href: '/admin/support', k: 'nav.support',    icon: '✉️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const clearAuth = useAuthStore(s => s.clearAuth);
  const user = useAuthStore(s => s.user);
  const t = useT();
  const isAdmin    = user?.role === 'ADMIN';
  const isProvider = user?.role === 'PROVIDER';
  const isRealtor  = user?.role === 'REALTOR';
  const isSelfTenant = user?.selfManagedRental === true;

  // NAV completo según rol
  const NAV = isProvider ? [
    { href: '/dashboard', k: 'nav.home',     icon: '🏠' },
    ...NAV_PROVIDER,
    { href: '/messages',  k: 'nav.messages', icon: '💬' },
    { href: '/support',   k: 'nav.support',  icon: '✉️' },
    { href: '/profile',   k: 'nav.profile',  icon: '👤' },
  ] : isRealtor ? [
    { href: '/dashboard', k: 'nav.home',     icon: '🏠' },
    ...NAV_REALTOR,
    { href: '/messages',  k: 'nav.messages', icon: '💬' },
    { href: '/support',   k: 'nav.support',  icon: '✉️' },
    { href: '/profile',   k: 'nav.profile',  icon: '👤' },
  ] : isSelfTenant ? NAV_SELF_TENANT : [
    ...NAV_BASE,
    ...NAV_TENANT_LANDLORD,
  ];
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
      <div className="h-16 flex items-center px-6 border-b border-habitta-deep/20">
        <HabittaLogo
          size={28}
          color="#E2C9A6"
          textColor="#F7F3EE"
          accentColor="#C98E5B"
          href="/dashboard"
        />
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV.map(item => (
          <Link
            key={item.href + item.k}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-habitta-terra text-habitta-cream shadow-sm'
                : 'text-habitta-cream/80 hover:bg-habitta-cream/10 hover:text-habitta-cream',
            )}
          >
            <span className="text-base">{item.icon}</span>
            {t(item.k)}
          </Link>
        ))}
        {isAdmin && (
          <>
            <div className="border-t border-habitta-cream/15 my-2" />
            {ADMIN_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-habitta-eucalyptus text-habitta-cream'
                    : 'text-habitta-cream/80 hover:bg-habitta-cream/10 hover:text-habitta-cream',
                )}
              >
                <span className="text-base">{item.icon}</span>
                {t(item.k)}
              </Link>
            ))}
          </>
        )}
      </nav>
      <div className="p-4 border-t border-habitta-cream/15">
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-habitta-cream/70 hover:text-habitta-terra px-3 py-2 rounded-xl hover:bg-habitta-cream/5 transition-colors"
        >
          {t('nav.logout')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-habitta-cream lg:flex">
      {/* ─── Sidebar DESKTOP (visible >= lg) ────────────────────── */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-habitta-deep border-r border-habitta-deep/20">
        {sidebarContent}
      </aside>

      {/* ─── Drawer MOBILE (visible cuando drawerOpen) ──────────── */}
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-habitta-deep/60 z-40 lg:hidden transition-opacity',
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-habitta-deep z-50 lg:hidden flex flex-col shadow-xl transition-transform',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* ─── Main content ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:overflow-hidden">
        {/* Header con hamburguesa en mobile */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-habitta-cream/90 backdrop-blur border-b border-habitta-sand flex items-center justify-between lg:justify-end px-4 lg:px-6 gap-2">
          {/* Hamburguesa — sólo mobile */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 -ml-2 hover:bg-habitta-sand rounded-lg text-habitta-deep"
            aria-label="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {/* Logo mobile centrado — navega a /dashboard */}
          <span className="lg:hidden">
            <HabittaLogo variant="wordmark" size={20} href="/dashboard" accentColor="#C98E5B" />
          </span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationsBell />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
