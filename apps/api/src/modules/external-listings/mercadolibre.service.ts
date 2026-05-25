import { Injectable, Logger } from '@nestjs/common';

/**
 * Cliente para la API pública de MercadoLibre — sitio MLA (Argentina),
 * categoría MLA1459 (Inmuebles).
 *
 * Desde 2024 MercadoLibre requiere autenticación incluso para búsquedas.
 * Usamos OAuth client_credentials grant: registramos una app en
 * https://developers.mercadolibre.com.ar y obtenemos:
 *   - MELI_CLIENT_ID
 *   - MELI_CLIENT_SECRET
 *
 * Si esas env vars NO están seteadas, caemos a modo MOCK con datos
 * sintéticos (5 inmuebles inventados) para que la UI funcione en local
 * y demo sin tener que registrar nada.
 *
 * Docs: https://developers.mercadolibre.com.ar/es_ar/inmuebles
 */

interface MeliSearchResult {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  permalink: string;
  thumbnail: string;
  address?: { city_name?: string; state_name?: string };
  location?: { city?: { name?: string }; state?: { name?: string } };
  attributes?: Array<{ id: string; name: string; value_name?: string | null; value_struct?: any }>;
  pictures?: Array<{ url: string }>;
}

export interface NormalizedListing {
  id: string;                  // "MLA-12345678"
  source: 'MERCADOLIBRE';
  title: string;
  price: number;
  currency: string;
  permalink: string;            // link al aviso original
  thumbnail: string;
  pictures: string[];
  city?: string;
  province?: string;
  rooms?: number;
  bathrooms?: number;
  squareMeters?: number;
  // Indicador de si los datos son del API real o mock
  isMock?: boolean;
}

@Injectable()
export class MercadoLibreService {
  private readonly logger = new Logger(MercadoLibreService.name);
  private readonly clientId = process.env.MELI_CLIENT_ID;
  private readonly clientSecret = process.env.MELI_CLIENT_SECRET;
  private readonly enabled = !!this.clientId && !!this.clientSecret;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  // Cache muy simple en memoria. Key = querystring, value = { ts, data }.
  // TTL 30 min — los listings de inmuebles no cambian con mucha frecuencia.
  private cache = new Map<string, { ts: number; data: NormalizedListing[] }>();
  private readonly cacheTtlMs = 30 * 60 * 1000;

  constructor() {
    if (!this.enabled) {
      this.logger.warn('MELI_CLIENT_ID/SECRET no configurados → MercadoLibreService en modo MOCK');
    }
  }

  /**
   * Búsqueda de inmuebles. Devuelve listings normalizados al shape de la app.
   *
   * @param opts.q       texto libre (ej "palermo", "balcón", etc.)
   * @param opts.city    ciudad (se concatena al q)
   * @param opts.maxPrice precio máximo en la moneda del listing
   * @param opts.limit   máximo 50 por request (default 20)
   */
  async search(opts: {
    q?: string;
    city?: string;
    maxPrice?: number;
    limit?: number;
  } = {}): Promise<NormalizedListing[]> {
    const limit = Math.min(opts.limit ?? 20, 50);
    const cacheKey = JSON.stringify({ ...opts, limit });

    // Cache hit
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.cacheTtlMs) {
      return cached.data;
    }

    let results: NormalizedListing[];
    if (!this.enabled) {
      results = this.mockSearch(opts, limit);
    } else {
      try {
        results = await this.realSearch(opts, limit);
      } catch (err) {
        this.logger.error(`Error consultando MercadoLibre, devolviendo mock: ${(err as Error).message}`);
        results = this.mockSearch(opts, limit);
      }
    }

    this.cache.set(cacheKey, { ts: Date.now(), data: results });
    return results;
  }

  // ─── REAL (API de MercadoLibre con OAuth) ──────────────────────────────

  private async realSearch(opts: { q?: string; city?: string; maxPrice?: number }, limit: number): Promise<NormalizedListing[]> {
    const token = await this.getAccessToken();
    const queryParts = [opts.q, opts.city].filter(Boolean).join(' ');
    const url = new URL('https://api.mercadolibre.com/sites/MLA/search');
    url.searchParams.set('category', 'MLA1459');  // Inmuebles
    if (queryParts) url.searchParams.set('q', queryParts);
    if (opts.maxPrice) url.searchParams.set('price', `*-${opts.maxPrice}`);
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`MELI ${res.status}: ${await res.text().catch(() => '')}`);
    }
    const data = (await res.json()) as { results?: MeliSearchResult[] };
    return (data.results ?? []).map(r => this.normalize(r));
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
    });
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`OAuth MELI ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  private normalize(r: MeliSearchResult): NormalizedListing {
    const rooms = this.extractAttr(r, 'ROOMS') ?? this.extractAttr(r, 'BEDROOMS');
    const bathrooms = this.extractAttr(r, 'FULL_BATHROOMS');
    const m2 = this.extractAttr(r, 'COVERED_AREA') ?? this.extractAttr(r, 'TOTAL_AREA');
    return {
      id: `MLA-${r.id}`,
      source: 'MERCADOLIBRE',
      title: r.title,
      price: r.price,
      currency: r.currency_id,
      permalink: r.permalink,
      thumbnail: r.thumbnail?.replace(/^http:/, 'https:'),
      pictures: (r.pictures ?? []).slice(0, 5).map(p => p.url),
      city: r.address?.city_name ?? r.location?.city?.name,
      province: r.address?.state_name ?? r.location?.state?.name,
      rooms: rooms ? Number(rooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      squareMeters: m2 ? Number(m2) : undefined,
    };
  }

  private extractAttr(r: MeliSearchResult, id: string): string | undefined {
    const attr = r.attributes?.find(a => a.id === id);
    return attr?.value_name ?? attr?.value_struct?.number?.toString();
  }

  // ─── MOCK (sin credenciales reales) ────────────────────────────────────

  private mockSearch(opts: { q?: string; city?: string; maxPrice?: number }, limit: number): NormalizedListing[] {
    const all = MOCK_LISTINGS;
    const q = (opts.q ?? '').toLowerCase();
    const city = (opts.city ?? '').toLowerCase();
    const filtered = all.filter(l => {
      if (q && !`${l.title} ${l.city}`.toLowerCase().includes(q)) return false;
      if (city && !(l.city ?? '').toLowerCase().includes(city)) return false;
      if (opts.maxPrice && l.price > opts.maxPrice) return false;
      return true;
    });
    return filtered.slice(0, limit).map(l => ({ ...l, isMock: true }));
  }
}

// Dataset mock con apariencia realista
const MOCK_LISTINGS: NormalizedListing[] = [
  {
    id: 'MLA-mock-001', source: 'MERCADOLIBRE',
    title: 'Departamento 2 ambientes - Palermo Soho con balcón',
    price: 425000, currency: 'ARS',
    permalink: 'https://inmuebles.mercadolibre.com.ar/MLA-mock-001',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_843906-MLA80876912849_122024-F.webp',
    pictures: [],
    city: 'Capital Federal', province: 'Buenos Aires',
    rooms: 2, bathrooms: 1, squareMeters: 55,
  },
  {
    id: 'MLA-mock-002', source: 'MERCADOLIBRE',
    title: 'Loft monoambiente Palermo Hollywood, vista al parque',
    price: 320000, currency: 'ARS',
    permalink: 'https://inmuebles.mercadolibre.com.ar/MLA-mock-002',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_695310-MLA85429001234_062025-F.webp',
    pictures: [],
    city: 'Capital Federal', province: 'Buenos Aires',
    rooms: 1, bathrooms: 1, squareMeters: 35,
  },
  {
    id: 'MLA-mock-003', source: 'MERCADOLIBRE',
    title: '3 ambientes Belgrano - amenities completos',
    price: 580000, currency: 'ARS',
    permalink: 'https://inmuebles.mercadolibre.com.ar/MLA-mock-003',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_915832-MLA87123890456_082025-F.webp',
    pictures: [],
    city: 'Capital Federal', province: 'Buenos Aires',
    rooms: 3, bathrooms: 2, squareMeters: 88,
  },
  {
    id: 'MLA-mock-004', source: 'MERCADOLIBRE',
    title: 'Casa en La Plata, City Bell - 4 amb + parque',
    price: 720000, currency: 'ARS',
    permalink: 'https://inmuebles.mercadolibre.com.ar/MLA-mock-004',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_710456-MLA82345678901_032025-F.webp',
    pictures: [],
    city: 'La Plata', province: 'Buenos Aires',
    rooms: 4, bathrooms: 2, squareMeters: 140,
  },
  {
    id: 'MLA-mock-005', source: 'MERCADOLIBRE',
    title: 'Monoambiente céntrico Córdoba - ideal estudiante UNC',
    price: 195000, currency: 'ARS',
    permalink: 'https://inmuebles.mercadolibre.com.ar/MLA-mock-005',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_852749-MLA89432167823_092025-F.webp',
    pictures: [],
    city: 'Córdoba', province: 'Córdoba',
    rooms: 1, bathrooms: 1, squareMeters: 32,
  },
  {
    id: 'MLA-mock-006', source: 'MERCADOLIBRE',
    title: 'Departamento 2 amb en Mendoza centro, cerca de bodegas',
    price: 280000, currency: 'ARS',
    permalink: 'https://inmuebles.mercadolibre.com.ar/MLA-mock-006',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_603782-MLA84567812345_062025-F.webp',
    pictures: [],
    city: 'Mendoza', province: 'Mendoza',
    rooms: 2, bathrooms: 1, squareMeters: 60,
  },
  {
    id: 'MLA-mock-007', source: 'MERCADOLIBRE',
    title: 'Casa quinta Pilar - 5 ambientes, pileta y parrilla',
    price: 950000, currency: 'ARS',
    permalink: 'https://inmuebles.mercadolibre.com.ar/MLA-mock-007',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_762891-MLA86789123456_072025-F.webp',
    pictures: [],
    city: 'Pilar', province: 'Buenos Aires',
    rooms: 5, bathrooms: 3, squareMeters: 220,
  },
  {
    id: 'MLA-mock-008', source: 'MERCADOLIBRE',
    title: 'Studio en Puerto Madero, vista al río',
    price: 850, currency: 'USD',
    permalink: 'https://inmuebles.mercadolibre.com.ar/MLA-mock-008',
    thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_945621-MLA88654321987_102025-F.webp',
    pictures: [],
    city: 'Capital Federal', province: 'Buenos Aires',
    rooms: 1, bathrooms: 1, squareMeters: 45,
  },
];
