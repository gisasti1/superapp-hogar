'use client';

import { useEffect, useRef } from 'react';

interface Props {
  latitude: number;
  longitude: number;
  address?: string;
  zoom?: number;
  height?: string;
}

/**
 * Mapa con OpenStreetMap vía Leaflet. Sin API key, sin tracking.
 * Carga Leaflet en cliente (no SSR) y crea el mapa de forma imperativa
 * para evitar problemas de tipos con react-leaflet 4 + Next.js 15.
 */
export function PropertyMap({ latitude, longitude, address, zoom = 15, height = '300px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let mapInstance: any;

    (async () => {
      const L = (await import('leaflet')).default;
      // CSS de Leaflet
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet', 'true');
        document.head.appendChild(link);
      }

      // Fix de iconos rotos (Leaflet busca rutas relativas que rompen con bundlers)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (cancelled || !containerRef.current) return;

      mapInstance = L.map(containerRef.current).setView([latitude, longitude], zoom);
      mapRef.current = mapInstance;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance);

      const marker = L.marker([latitude, longitude]).addTo(mapInstance);
      if (address) marker.bindPopup(address).openPopup();
    })();

    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, zoom, address]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
      style={{ height, width: '100%' }}
    />
  );
}
