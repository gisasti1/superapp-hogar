'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { clsx } from 'clsx';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Usuarios', icon: '👥' },
  { href: '/admin/properties', label: 'Propiedades', icon: '🏘️' },
  { href: '/admin/providers', label: 'Prestadores', icon: '🛠' },
  { href: '/admin/providers/review', label: 'Verificar identidad', icon: '🪪' },
  { href: '/admin/deposits', label: 'Depósitos', icon: '🏦' },
  { href: '/admin/issues', label: 'Desperfectos', icon: '🚨' },
  { href: '/admin/marketing', label: 'Marketing', icon: '📈' },
  { href: '/admin/segments', label: 'Segmentos', icon: '🎯' },
  { href: '/admin/campaigns', label: 'Campañas', icon: '📨' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  // Solo admins entran. Si no, redirect al dashboard normal.
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user) return null;
  if (user.role !== 'ADMIN') {
    return (
      <div className="card text-center py-12 space-y-2">
        <div className="text-4xl">🛡</div>
        <p className="text-gray-700">Esta sección es sólo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-4">
        <p className="text-xs uppercase tracking-wide opacity-80">Panel de administración</p>
        <p className="text-lg font-bold">SuperApp Hogar — Admin</p>
      </div>

      {/* Tabs admin */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {ADMIN_NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'text-sm px-3 py-1.5 rounded-lg font-medium transition-colors',
                active
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              <span className="mr-1">{item.icon}</span>{item.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
