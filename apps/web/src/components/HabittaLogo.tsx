'use client';

/**
 * Logo Habitta — casita estilizada con dos ventanitas + wordmark.
 * Inspirado en el moodboard del rebrand.
 *
 * Uso:
 *   <HabittaLogo />                          // logo + wordmark default
 *   <HabittaLogo variant="mark" size={48} /> // solo el ícono
 *   <HabittaLogo color="#fff" />             // sobre fondos oscuros
 */
export function HabittaLogo({
  variant = 'full',
  size    = 40,
  color   = '#8C6B4E',
  textColor,
  tagline = false,
}: {
  variant?: 'full' | 'mark' | 'wordmark';
  size?:    number;
  color?:   string;
  textColor?: string;
  tagline?: boolean;
}) {
  const txt = textColor ?? '#4B3F35';

  return (
    <div className="inline-flex items-center gap-3">
      {variant !== 'wordmark' && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Habitta"
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
          {/* Ventanitas — dos cuadrados pequeños */}
          <rect x="22" y="34" width="8" height="8" rx="1.5" stroke={color} strokeWidth="2.6" fill="none" />
          <rect x="34" y="34" width="8" height="8" rx="1.5" stroke={color} strokeWidth="2.6" fill="none" />
        </svg>
      )}

      {variant !== 'mark' && (
        <div className="flex flex-col leading-none">
          <span
            className="font-extrabold tracking-tight"
            style={{ color: txt, fontSize: size * 0.85 }}
          >
            habitta
          </span>
          {tagline && (
            <span
              className="text-[0.55em] font-medium mt-1.5"
              style={{ color: txt, fontSize: size * 0.27 }}
            >
              Donde tu hogar, <span style={{ color: '#C98E5B' }}>encuentra todo.</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
