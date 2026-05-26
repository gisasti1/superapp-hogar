'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Una URL `/uploads/...` viene relativa al API. Las externas pasan tal cual. */
function resolveUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

const SIZE_CLASS: Record<string, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-2xl',
};

/**
 * Avatar circular con foto o iniciales como fallback.
 * Si la imagen falla en cargar, hace fallback automáticamente a iniciales
 * (importante para URLs muertas tras un reset de /tmp en Render).
 */
export function Avatar({
  url,
  firstName,
  lastName,
  nickname,
  size = 'md',
  className = '',
}: {
  url?: string | null;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveUrl(url);

  const initials = (
    (firstName?.[0] ?? '') + (lastName?.[0] ?? '')
  ).toUpperCase() || nickname?.[0]?.toUpperCase() || '?';

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={firstName ? `${firstName} ${lastName ?? ''}` : 'Avatar'}
        onError={() => setFailed(true)}
        className={`${SIZE_CLASS[size]} rounded-full object-cover bg-gray-200 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZE_CLASS[size]} rounded-full bg-brand-600 text-white font-bold flex items-center justify-center shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}
