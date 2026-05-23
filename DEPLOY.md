# Guía de deploy a producción

Esta guía cubre **3 caminos** para llevar SuperApp Hogar a producción real, ordenados de más simple a más complejo.

---

## Opción 1 — Single-host con Docker Compose (recomendado para empezar)

**Cuándo usarla:** querés algo simple, en una sola VM. Funciona para hasta ~1.000 usuarios activos sin sweat.

### Pre-requisitos
- Una VM Linux con Docker + Docker Compose (DigitalOcean droplet $6/mes, Hetzner CX11 €4/mes, AWS Lightsail $5/mes)
- Un dominio (`superapphogar.com`, o lo que quieras)
- Acceso SSH

### Pasos

```bash
# 1) En tu VM clonás el repo
git clone https://github.com/tu-usuario/superapp-hogar.git
cd superapp-hogar

# 2) Copiás el template de env vars y completás
cp .env.prod.example .env.prod
# editás .env.prod con tus secretos:
# - POSTGRES_PASSWORD: generá con `openssl rand -base64 32`
# - JWT_SECRET, JWT_REFRESH_SECRET: `openssl rand -hex 64`
# - WEB_URL, API_PUBLIC_URL: las URLs públicas (HTTPS)
# - API keys de Mercado Pago, RENAPER, etc. (opcionales)

# 3) Levantás todo
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 4) Aplicás migraciones
docker compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma

# 5) Creás el usuario admin
docker compose -f docker-compose.prod.yml exec \
  -e ADMIN_EMAIL="admin@tu-dominio.com" \
  -e ADMIN_PASSWORD="$(openssl rand -base64 24)" \
  -e ADMIN_FIRST_NAME="Tu" -e ADMIN_LAST_NAME="Nombre" \
  api npx ts-node /app/packages/database/prisma/seed.prod.ts
# ↑ guardate la password que se genera, te va a hacer falta para el primer login
```

### Reverse proxy + HTTPS (Caddy es lo más simple)

Instalá Caddy en la VM:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo tee /etc/apt/trusted.gpg.d/caddy-stable.asc
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

`/etc/caddy/Caddyfile`:
```
app.superapphogar.com {
  reverse_proxy localhost:3000
}

api.superapphogar.com {
  reverse_proxy localhost:4000
}
```

```bash
sudo systemctl restart caddy
```

Caddy obtiene certificados Let's Encrypt automáticamente. **Tu app ya está en HTTPS.**

### Mantenimiento

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# Actualizar después de un git pull
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Backup de Postgres (corré diariamente con cron)
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U superapp superapp_hogar > backup-$(date +%F).sql
```

---

## Opción 2 — Managed services (Vercel + Railway + Neon)

**Cuándo usarla:** querés cero ops, deploy en push a `main`, escalado automático. Cuesta más (~$25-50/mes para empezar).

### Web → Vercel (gratis para hobby)
1. Conectá tu repo de GitHub a Vercel
2. Root directory: `apps/web`
3. Build command: `pnpm --filter @superapp/web build`
4. Install command: `pnpm install`
5. Output directory: `.next`
6. Env vars en Vercel:
   - `NEXT_PUBLIC_API_URL=https://api.tu-dominio.com`

### API → Railway o Fly.io ($5-10/mes)

**Railway** (más fácil):
1. Conectá tu repo
2. Apuntá al root del repo (Railway detecta el Dockerfile en `apps/api/Dockerfile`)
3. Settings → Builder: Dockerfile, path `apps/api/Dockerfile`
4. Variables → pegá todo tu `.env.prod` (excepto las cosas de Postgres si usás Neon)
5. Settings → Networking → Generate public domain

**Fly.io**:
```bash
cd apps/api
fly launch --no-deploy
# editá fly.toml: internal_port=4000
fly secrets set DATABASE_URL=... JWT_SECRET=... # etc
fly deploy
```

### Postgres → Neon (gratis hasta 3 GB)
1. Crear proyecto en https://neon.tech
2. Copiar la connection string
3. Setear en Railway/Fly como `DATABASE_URL`
4. Correr migrations:
   ```bash
   DATABASE_URL="postgres://..." pnpm --filter @superapp/database exec prisma migrate deploy
   ```
5. Crear admin:
   ```bash
   DATABASE_URL="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." \
     pnpm --filter @superapp/database db:seed:prod
   ```

### Storage → AWS S3 o Cloudflare R2 (R2 = gratis hasta 10 GB)
1. Crear bucket
2. Crear API key con permisos `s3:PutObject`, `s3:GetObject`
3. Setear en Railway: `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

---

## Opción 3 — Self-hosted Kubernetes (avanzado)

Para esto necesitás un equipo de DevOps. Los manifests no están incluidos en este repo — pedímelos si querés que los arme.

---

## Checklist de hardening para producción

Antes de pasarle el dominio a usuarios reales, verificá:

- [ ] **Contraseñas únicas**: JWT_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD generados con `openssl rand`
- [ ] **HTTPS forzado** (Caddy lo hace solo; Vercel también)
- [ ] **CORS restringido**: `ALLOWED_ORIGINS` apunta SOLO a tu dominio de prod, no `*`
- [ ] **NODE_ENV=production** en el contenedor de API (helmet aplica CSP)
- [ ] **Swagger desactivado**: la app lo hace automático cuando `NODE_ENV=production`
- [ ] **Backups de DB**: Neon y RDS los hacen solos; si usás docker compose configurá cron
- [ ] **Monitoreo**: agregá Sentry/Logflare/Datadog (no incluido — fácil de integrar)
- [ ] **Rate limiting**: ya está activo en `/auth/*` (10 req/min) — ajustá si necesitás
- [ ] **Health checks**: tu load balancer debe pegarle a `GET /api/health`
- [ ] **Secrets en variable manager** (no en `.env` en disco) — usá AWS Secrets Manager, Doppler, etc.

---

## Integradores externos

Todos son **opcionales**. Si no los configurás, la app corre en modo mock (datos fake).

| Integrador | Cuándo configurarlo | Cuánto cuesta |
|---|---|---|
| **Mercado Pago** | Para cobrar de verdad | 4.99% + IVA por transacción |
| **RENAPER** | Para validar DNI real | Hablar con AFIP/RENAPER (≈$0.30 USD por validación) |
| **Anthropic Claude** | Para mediación IA real | ~$3-15 / 1M tokens |
| **Pinecone** | Para retrieval de jurisprudencia | Free tier OK al empezar |
| **DocuSign** | Firma con certificado calificado | $25/mes plan personal |
| **Sendgrid** | Emails transaccionales | Free hasta 100/día |
| **Twilio** | SMS / 2FA | $0.05 / SMS en AR |
| **AWS S3** o **Cloudflare R2** | Uploads de imágenes | R2 gratis hasta 10 GB |

---

## Troubleshooting

**`prisma migrate deploy` falla con "P3018: A migration failed"**
Tu DB tiene tablas pre-existentes (típico de upgrades desde `db:push`). Marcá la migración como aplicada:
```bash
DATABASE_URL="..." npx prisma migrate resolve --applied 20260523000000_initial
```

**Container de API arranca y se cierra inmediatamente**
Mirá los logs (`docker compose logs api`). Típicamente es alguna env var faltante — la validación con Zod te dice exactamente cuál.

**Errores CORS en el navegador**
Verificá que `ALLOWED_ORIGINS` en el API incluye el dominio exacto donde corre la web (con o sin `www`).

---

## Pre-flight check

Antes del primer deploy, corré localmente:

```bash
pnpm -r typecheck    # todos los paquetes compilan
pnpm -r test         # todos los tests pasan
pnpm -r build        # todo buildea
docker compose -f docker-compose.prod.yml --env-file .env.prod build  # docker compila los Dockerfiles
```

Si los 4 pasan, estás listo para deployar.
