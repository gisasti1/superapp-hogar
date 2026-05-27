'use client';

import Link from 'next/link';

/**
 * Logo Habitta — casita estilizada con dos ventanitas + wordmark.
 *
 * Props:
 *  - variant: 'full' (default) | 'mark' | 'wordmark'
 *  - size: px del ícono (texto escala 0.85x). Default 40.
 *  - color:     color del ÍCONO (casita). Default tierra.
 *  - textColor: color del WORDMARK "Habitta". Default marrón profundo.
 *  - accentColor: color del PUNTO acento (después de la 2da "t"). Default terracota.
 *  - tagline: muestra "Donde tu hogar, encuentra todo."
 *  - href: si está, el logo se vuelve clickeable y navega ahí.
 *          Default: '/' (inicio).
 *  - noLink: pasá true para forzar que NO sea clickeable (útil dentro de otros links).
 */
export function HabittaLogo({
  variant     = 'full',
  size        = 40,
  color       = '#8C6B4E',
  textColor   = '#4B3F35',
  accentColor = '#C98E5B',
  tagline     = false,
  href        = '/',
  noLink      = false,
}: {
  variant?:     'full' | 'mark' | 'wordmark';
  size?:        number;
  color?:       string;
  textColor?:   string;
  accentColor?: string;
  tagline?:     boolean;
  href?:        string;
  noLink?:      boolean;
}) {
  const content = (
    <div className="inline-flex items-center gap-3 group">
      {variant !== 'wordmark' && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Habitta"
          className="transition-transform group-hover:scale-105"
        >
          {/* Techo + paredes — trazo continuo redondeado */}
          <path
            d="M10 32 L32 12 L54 32 M14 30 L14 52 Q14 54 16 54 L48 54 Q50 54 50 52 L50 30"
            stroke={color}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Ventanitas */}
          <rect x="22" y="34" width="8" height="8" rx="1.5" stroke={color} strokeWidth="2.6" fill="none" />
          <rect x="34" y="34" width="8" height="8" rx="1.5" stroke={color} strokeWidth="2.6" fill="none" />
        </svg>
      )}

      {variant !== 'mark' && (
        <div className="flex flex-col leading-none">
          <span
            className="font-extrabold tracking-tight inline-flex items-baseline"
            style={{ color: textColor, fontSize: size * 0.85 }}
          >
            Habitta
            {/* Punto-acento estilo "casa habitada" */}
            <span
              className="ml-0.5"
              style={{ color: accentColor, fontSize: size * 0.85 }}
              aria-hidden="true"
            >.</span>
          </span>
          {tagline && (
            <span
              className="font-medium mt-1.5"
              style={{ color: textColor, fontSize: size * 0.27 }}
            >
              Donde tu hogar, <span style={{ color: accentColor }}>encuentra todo.</span>
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (noLink) return content;
  return (
    <Link href={href} className="inline-block focus:outline-none focus:ring-2 focus:ring-habitta-terra/40 focus:ring-offset-2 focus:ring-offset-habitta-cream rounded-lg" aria-label="Inicio Habitta">
      {content}
    </Link>
  );
}
