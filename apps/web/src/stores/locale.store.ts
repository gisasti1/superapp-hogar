'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'es' | 'en' | 'pt';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    set => ({
      locale: 'es',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'superapp-locale' },
  ),
);
