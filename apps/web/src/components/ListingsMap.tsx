'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface MapListing {
  id: string;          // listing id
  propertyId: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  monthlyRent: number;
  currency: string;
  rooms?: number;
}

/**
 * Mapa con clusters para la búsqueda de inmuebles. Usa Leaflet +
 * leaflet.markercluster con OpenStreetMap. Carga libs en cliente
 * (no SSR) para no romper el bundle de Next.
 */
export function ListingsMap({
  listings,
  height = '420px',
}: {
  listings: MapListing[];
  height?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let mapInstance: any;
    let clusterGroup: any;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');

      // CSS de Leaflet + cluster (los inyectamos una sola vez)
      const cssLinks = [
        { rel: 'leaflet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' },
        { rel: 'leaflet-cluster', href: 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css' },
        { rel: 'leaflet-cluster-default', href: 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css' },
      ];
      for (const c of cssLinks) {
        if (!document.querySelector(`link[data-${c.rel}]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = c.href;
          link.setAttribute(`data-${c.rel}`, 'true');
          document.head.appendChild(link);
        }
      }

      // Fix de iconos rotos
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (cancelled || !containerRef.current) return;

      // Calcular bounds para encuadrar todos los markers (o default a CABA)
      const validListings = listings.filter(l => l.latitude != null && l.longitude != null);
      const center: [number, number] = validListings.length
        ? [
            validListings.reduce((s, l) => s + Number(l.latitude), 0) / validListings.length,
            validListings.reduce((s, l) => s + Number(l.longitude), 0) / validListings.length,
          ]
        : [-34.6037, -58.3816];

      mapInstance = L.map(containerRef.current).setView(center, validListings.length ? 12 : 6);
      mapRef.current = mapInstance;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(mapInstance);

      // Cluster group
      clusterGroup = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60,
      });
      clusterRef.current = clusterGroup;

      validListings.forEach(l => {
        const marker = L.marker([Number(l.latitude), Number(l.longitude)]);
        const popupHtml = `
          <div style="min-width:200px">
            <p style="font-weight:600;margin:0 0 4px 0">${escapeHtml(l.address)}</p>
            <p style="font-size:11px;color:#6b7280;margin:0 0 6px 0">${escapeHtml(l.city)}${l.rooms ? ' · ' + l.rooms + ' amb' : ''}</p>
            <p style="font-weight:700;color:#1a56db;margin:0 0 8px 0">$${l.monthlyRent.toLocaleString('es-AR')} ${l.currency}/mes</p>
            <button style="background:#1a56db;color:white;border:0;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;width:100%" id="goto-${l.id}">Ver detalle →</button>
          </div>
        `;
        marker.bindPopup(popupHtml);
        marker.on('popupopen', () => {
          setTimeout(() => {
            document.getElementById(`goto-${l.id}`)?.addEventListener('click', () => {
              router.push(`/listings/${l.id}`);
            });
          }, 50);
        });
        clusterGroup.addLayer(marker);
      });

      mapInstance.addLayer(clusterGroup);

      if (validListings.length > 1) {
        try {
          mapInstance.fitBounds(clusterGroup.getBounds().pad(0.15));
        } catch { /* noop */ }
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, [listings, router]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
      style={{ height, width: '100%' }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
