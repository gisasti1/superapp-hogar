import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Habitta — Donde tu hogar, encuentra todo',
  description: 'Alquilá fácil. Viví tranquilo. Seguro de caución, contrato digital, pagos y servicios del hogar en un solo lugar.',
  manifest: '/manifest.json',
  applicationName: 'Habitta',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Habitta',
  },
  icons: {
    icon: [
      { url: '/icon-192.svg', type: 'image/svg+xml', sizes: '192x192' },
      { url: '/icon-512.svg', type: 'image/svg+xml', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#C98E5B',  // habitta-terra
  // Soporta safe-area de iPhone X+ (notch)
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
