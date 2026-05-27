import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#1a56db',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        // ─── Paleta Habitta (rebrand propuesto) ─────────────────────────
        habitta: {
          // Principales
          deep:      '#4B3F35',  // Marrón Profundo — texto principal, headings
          earth:     '#8C6B4E',  // Tierra — acentos cálidos, CTAs secundarios
          olive:     '#A4977A',  // Verde Oliva Suave — divisores, bordes
          sand:      '#EDE6D9',  // Arena Clara — fondos de cards
          stone:     '#B5ADA1',  // Gris Piedra — texto secundario, placeholders
          // Secundarias
          cream:     '#F7F3EE',  // Crema — background principal de la app
          beige:     '#E2C9A6',  // Beige Natural — highlights suaves
          terra:     '#C98E5B',  // Terracota Suave — CTA primario (botones)
          eucalyptus:'#7E9081',  // Verde Eucalipto — éxitos / "vivir tranquilo"
          charcoal:  '#5A5147',  // Marrón Oscuro — texto sobre fondos claros
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
