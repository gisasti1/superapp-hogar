# SuperApp del Hogar 🏠

Super-app inmobiliaria para el mercado argentino: KYC, seguros de caución, contratos digitales, mediación con IA, pagos, depósitos en garantía, marketplace de servicios.

---

## Cómo usarla (paso a paso)

Tenés que abrir la **Terminal** y entrar a esta carpeta una sola vez:

```bash
cd /Users/fernandoisasti/dev/superapp-hogar
```

### Arrancar todo

```bash
pnpm start
```

Eso levanta Postgres + API + Web. Te muestra al final algo así:

```
✅ SuperApp Hogar funcionando
🌐 Web:      http://localhost:3000
📡 API:      http://localhost:4000
📚 Swagger:  http://localhost:4000/api/docs
```

Abrí **http://localhost:3000** en el navegador y entrá con cualquiera de los usuarios de prueba.

### Detener todo

```bash
pnpm stop
```

### Ver logs (si algo falla)

```bash
tail -f .local-db/logs/api.log    # logs del backend
tail -f .local-db/logs/web.log    # logs de la web
```

---

## Usuarios de prueba

Todos con contraseña **`Password123!`**

| Email | Rol | Para qué sirve |
|---|---|---|
| `admin@superapphogar.com` | Admin | Ve todo |
| `propietario@test.com` | Propietario | Publicar propiedades, ver contratos |
| `inquilino@test.com` | Inquilino | Buscar, alquilar, pagar |

---

## Qué tiene la app (12 sprints, todo implementado)

**Backend (NestJS + Postgres):**
- ✅ Auth con JWT (login, registro, refresh tokens, sesiones, **forgot/reset password**)
- ✅ KYC con RENAPER (modo mock — siempre aprueba en local)
- ✅ Seguros de caución (Finaer, mock)
- ✅ Contratos digitales (DocuSign, mock)
- ✅ Pagos con Mercado Pago (mock)
- ✅ Depósitos en garantía con ledger doble-entrada
- ✅ Mediación de conflictos con IA (Claude + Pinecone, mock sin keys)
- ✅ Notificaciones push (Expo)
- ✅ Suscripciones Premium
- ✅ Marketplace de servicios (gasistas, plomeros, etc.)
- ✅ Audit log completo

**Web (Next.js 15):**
19 páginas — login, registro (con selector Inquilino/Propietario), recuperar/resetear contraseña, **verificación de identidad (KYC)**, dashboard, listings (con filtros avanzados: mascotas, expensas, amenities), publicar inmueble, detalle con **galería de fotos** y **mapa OpenStreetMap**, contratos, pagos, seguros, mediación, premium, perfil.

**Registro y verificación:**
- Al registrarte elegís si sos **Inquilino** o **Propietario**
- Usuario nuevo arranca con verificación PENDING y banner en el dashboard
- Página `/kyc` con verificación rápida (modo demo): ingresás DNI → quedás verificado
- En producción reemplaza por flujo completo: subir foto del DNI + selfie + validar contra RENAPER

**Otras features clave:**
- 📷 Upload de fotos de propiedades (multer + serve-static, max 5 MB c/u, hasta 10 por propiedad)
- 🗺️ Mapa Leaflet con OpenStreetMap (sin API key, sin tracking)
- 📍 Geocoder Nominatim — auto-completa lat/lng desde la dirección
- 🐾 Filtros por mascotas permitidas
- 🏊 Filtros por amenities (pileta, gimnasio, parrilla, cochera, etc.)
- 💰 Filtros por expensas máximas
- 🔑 Reset de contraseña con token + TTL 1h + invalidación de sesiones
- 🔔 Notificaciones en tiempo real con campanita en el header (poll cada 30s)
- ✏️ Editar/despublicar/eliminar propiedades propias (con guards de ownership y contratos activos)

**Production-ready:**
- ✅ Health check endpoint `GET /api/health` con check de DB y uptime
- ✅ Validación de env vars al arranque con Zod (falla rápido si falta algo)
- ✅ Helmet con CSP estricto en producción, CORS configurable
- ✅ Swagger sólo en non-prod, graceful shutdown
- ✅ 36 tests unitarios (Auth, Listings, Contracts, Payments)
- ✅ Página 404 personalizada + páginas de Privacidad y Términos
- ✅ Dockerfile multi-stage para API y Web (output standalone)
- ✅ `docker-compose.prod.yml` para deploy single-host con un comando
- ✅ Migraciones Prisma versionadas + seed dedicado para producción
- ✅ CI con typecheck + tests + build + Docker images (GitHub Actions)
- ✅ Guía completa de deploy en [DEPLOY.md](./DEPLOY.md)

**Mobile (Expo / React Native):**
App nativa iOS + Android con las mismas funciones (todavía no levantada en local, necesitás Expo Go o Xcode).

---

## ¿Y los integradores reales (Mercado Pago, RENAPER, etc.)?

La app funciona **sin necesidad de ninguna API key** porque todos los integradores tienen modo MOCK. Pagos se simulan, KYC siempre aprueba, mediación devuelve respuestas pre-hechas.

Para conectar los reales, editá `.env` y poné las API keys verdaderas (los campos están vacíos). La app las detecta automáticamente y deja de mockear.

---

## Estructura del proyecto

```
superapp-hogar/
├── apps/
│   ├── api/         ← Backend NestJS (puerto 4000)
│   ├── web/         ← Frontend Next.js (puerto 3000)
│   └── mobile/      ← App Expo (iOS + Android)
├── packages/
│   ├── shared/      ← Tipos compartidos
│   └── database/    ← Schema Prisma + cliente
├── scripts/
│   ├── start-all.mjs    ← El comando `pnpm start`
│   ├── stop-all.mjs     ← El comando `pnpm stop`
│   └── local-db.mjs     ← Postgres embebido
├── .env             ← Variables de entorno (NO SUBIR a git)
└── README.md
```

---

## Problemas comunes

**"Puerto 3000 / 4000 / 5432 ya está en uso"**
Hacé `pnpm stop` para detener todo y volvé a `pnpm start`.

**"Cannot find module 'embedded-postgres'" o similar**
Reinstalá dependencias:
```bash
pnpm install
```

**Querés borrar la base de datos y empezar de cero**
```bash
pnpm stop
rm -rf .local-db
pnpm start
```
(va a recrear la base, las tablas y los usuarios de prueba)

**Postgres se queja al arrancar (libicudata.dylib missing)**
Corré esto una vez:
```bash
node scripts/fix-dylib-symlinks.mjs
```
(arregla un bug del paquete `embedded-postgres` que usamos)

---

## Datos técnicos (para developers)

- **Stack:** Turborepo + pnpm 10 + Node 20 + TypeScript 5.7
- **Backend:** NestJS 10 + Prisma 6 + PostgreSQL 18 + Passport JWT
- **Web:** Next.js 15 App Router + Tailwind + React Query + Zustand
- **Mobile:** Expo 52 + Expo Router + React Native 0.76
- **DB local:** `embedded-postgres` (binario portable, sin Docker)
