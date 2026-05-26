'use client';

import { useLocaleStore } from '@/stores/locale.store';
import es from './messages/es.json';
import en from './messages/en.json';
import pt from './messages/pt.json';

export type Locale = 'es' | 'en' | 'pt';

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'es', label: 'Español',    flag: '🇦🇷' },
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
];

const dictionaries: Record<Locale, Record<string, string>> = {
  es: es as Record<string, string>,
  en: en as Record<string, string>,
  pt: pt as Record<string, string>,
};

/**
 * Hook de traducción simple.
 *
 * Uso:
 *   const t = useT();
 *   <h1>{t('myRental.header.title')}</h1>
 *   <p>{t('myRental.summary.dueDayOfMonth', { day: 10 })}</p>
 *
 * Si la key falta en el idioma actual cae a ES; si tampoco está, devuelve la key
 * para que sea visible en pantalla qué traducción falta.
 */
export function useT() {
  const locale = useLocaleStore(s => s.locale);
  return (key: string, vars?: Record<string, string | number>) => {
    const dict     = dictionaries[locale] ?? dictionaries.es;
    const fallback = dictionaries.es;
    let str = dict[key] ?? fallback[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  };
}
