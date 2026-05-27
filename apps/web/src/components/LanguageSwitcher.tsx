'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocaleStore } from '@/stores/locale.store';
import { LOCALES, type Locale } from '@/i18n';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale    = useLocaleStore(s => s.locale);
  const setLocale = useLocaleStore(s => s.setLocale);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find(l => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
        title="Idioma / Language"
      >
        <span>{current.flag}</span>
        {!compact && <span className="hidden sm:inline">{current.code.toUpperCase()}</span>}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden min-w-[150px]">
          {LOCALES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLocale(l.code as Locale); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left ${
                l.code === locale ? 'bg-habitta-sand text-habitta-earth font-semibold' : 'text-gray-700'
              }`}
            >
              <span className="text-lg">{l.flag}</span>
              <span className="flex-1">{l.label}</span>
              {l.code === locale && <span className="text-habitta-terra">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
