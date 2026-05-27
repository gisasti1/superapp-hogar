'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api';

/**
 * 🔎 Lupa + modal de búsqueda global por palabras clave.
 *
 * UX:
 *  - Lupa siempre visible en el header.
 *  - Click o atajo Cmd/Ctrl+K abre un modal con input grande.
 *  - Mientras escribís, busca con debounce 300ms y muestra resultados
 *    agrupados por tipo (inmuebles, servicios, contratos, etc).
 *  - Click en un resultado → navega y cierra el modal.
 *  - ESC cierra.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K → abrir
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus al abrir
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  // Debounce de la query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn:  () => searchApi.query(debounced),
    enabled:  debounced.trim().length >= 2,
    staleTime: 30_000,
  });

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    router.push(href);
  };

  return (
    <>
      {/* Botón de la lupa en el header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-habitta-olive/40 hover:bg-habitta-sand text-habitta-charcoal hover:text-habitta-deep transition-colors text-sm"
        aria-label="Buscar"
        title="Buscar (Cmd+K)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="hidden md:inline text-[10px] font-mono bg-habitta-sand text-habitta-stone px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-habitta-deep/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-habitta-cream rounded-2xl shadow-2xl w-full max-w-2xl max-h-[75vh] flex flex-col overflow-hidden border border-habitta-olive/30"
          >
            {/* Input */}
            <div className="border-b border-habitta-sand p-3 flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-habitta-stone shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar inmuebles, servicios, contratos, recibos…"
                className="flex-1 bg-transparent outline-none text-habitta-deep placeholder:text-habitta-stone text-base"
              />
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-habitta-stone hover:text-habitta-deep px-2 py-1 rounded border border-habitta-olive/30"
              >
                ESC
              </button>
            </div>

            {/* Resultados */}
            <div className="flex-1 overflow-y-auto">
              {q.trim().length < 2 ? (
                <EmptyHint />
              ) : isFetching ? (
                <div className="text-center py-10 text-habitta-stone text-sm">Buscando…</div>
              ) : !data?.total ? (
                <div className="text-center py-10 text-habitta-stone text-sm">
                  Sin resultados para <strong className="text-habitta-deep">"{q}"</strong>.
                </div>
              ) : (
                <div className="p-2 space-y-3">
                  {data.groups.map((g: any) => (
                    <div key={g.key}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-habitta-stone px-3 py-1.5 flex items-center gap-1">
                        <span>{g.icon}</span> {g.title}
                        <span className="text-habitta-stone/50">· {g.items.length}</span>
                      </p>
                      <ul className="space-y-0.5">
                        {g.items.map((item: any) => (
                          <li key={item.id}>
                            <button
                              onClick={() => go(item.href)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-habitta-sand transition-colors flex items-start justify-between gap-3"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-habitta-deep text-sm truncate">{item.title}</p>
                                {item.subtitle && <p className="text-xs text-habitta-stone truncate">{item.subtitle}</p>}
                              </div>
                              {item.meta && (
                                <span className="text-xs text-habitta-terra font-medium shrink-0 max-w-[40%] truncate">
                                  {item.meta}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-habitta-sand px-4 py-2 text-[10px] text-habitta-stone flex items-center justify-between">
              <span>Tip: usá <kbd className="font-mono bg-habitta-sand px-1 rounded">Cmd+K</kbd> para abrir desde cualquier lado</span>
              {data?.total > 0 && <span>{data.total} resultados</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EmptyHint() {
  return (
    <div className="text-center py-10 px-4 space-y-3">
      <p className="text-4xl">🔎</p>
      <p className="text-sm text-habitta-charcoal">Escribí al menos <strong>2 letras</strong> para buscar.</p>
      <div className="flex flex-wrap justify-center gap-2 text-[11px] text-habitta-stone">
        {['Palermo', 'plomero', 'EDESUR', 'caución', 'R-2026', 'mediación'].map(s => (
          <span key={s} className="bg-habitta-sand px-2 py-0.5 rounded-full">{s}</span>
        ))}
      </div>
    </div>
  );
}
