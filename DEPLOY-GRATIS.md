# 🚀 Deploy 100% gratis sin tarjeta — paso a paso

App en internet sin gastar un peso. Total: ~25 minutos.

Stack:
- **GitHub** (gratis) — para el código (ya está hecho ✅)
- **Vercel** (gratis) — para la web
- **Render.com** (gratis) — para la API
- **Neon** (gratis) — para Postgres

**Único trade-off:** la API en Render Free duerme después de 15 min de inactividad y tarda ~30 segundos en despertar la primera vez. Para tu demo está perfecto. Si después querés que esté siempre despierta, son $7/mes.

---

## Paso 1 — Crear cuenta en Neon (Postgres) — 2 min

1. Andá a 👉 **https://neon.tech**
2. Click **"Sign up"** arriba a la derecha → **"Continue with GitHub"**
3. Autorizá → te crea un proyecto default automáticamente
4. **Importante:** click **"Connection string"** o copia que aparece arriba, copiá ese string (algo tipo `postgresql://neondb_owner:xxxx@ep-xxx.neon.tech/neondb?sslmode=require`)
5. **Guardalo en un papel** — lo vas a usar en el próximo paso.

---

## Paso 2 — Crear cuenta en Render — 3 min

1. Andá a 👉 **https://render.com/register**
2. Click **"GitHub"** → autorizás
3. Listo. **NO te pide tarjeta** para el tier gratis.

---

## Paso 3 — Deployar la API en Render — 5 min

1. En Render → click **"New +"** arriba derecha → **"Blueprint"**
2. Click **"Connect a repository"**
3. Si es la primera vez: te pide autorizar Render en GitHub → autorizá el repo `superapp-hogar`
4. Volvés a Render → elegí `gisasti1/superapp-hogar`
5. Render detecta el `render.yaml` automáticamente y muestra una preview del servicio `superapp-api`
6. Te pide completar **2 env vars** (las que dicen "sync: false"):
   - **`DATABASE_URL`** → pegá la connection string que copiaste de Neon
   - **`ALLOWED_ORIGINS`** → poné por ahora `*` (lo cambiamos después por la URL real de Vercel)
7. Click **"Apply"** o **"Create Blueprint"**
8. Render empieza a buildear el Dockerfile. **Tarda ~8-12 minutos** la primera vez (es normal, está descargando dependencias y compilando todo).

Mientras buildea pasamos al siguiente paso.

---

## Paso 4 — Deployar la Web en Vercel — 3 min

1. Andá a 👉 **https://vercel.com/signup** → **"Continue with GitHub"** → autorizá
2. En el dashboard de Vercel: **"Add New..."** → **"Project"**
3. Buscá `superapp-hogar` → click **"Import"**
4. En **"Configure Project"**:
   - **Root Directory**: click **"Edit"** → escribir `apps/web` → click "Continue"
   - **Framework Preset**: Vercel detecta Next.js solo, no toques
   - **Build & Output Settings**: dejá los defaults
5. En **"Environment Variables"** agregás 1 sola:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: deja un placeholder por ahora, ej: `https://superapp-api.onrender.com`
     (lo cambiamos en el paso 6 con la URL real de Render)
6. Click **"Deploy"**
7. En ~2 minutos te da una URL tipo `superapp-hogar.vercel.app` o `superapp-hogar-xxx.vercel.app`

---

## Paso 5 — Aplicar migraciones a Neon — 2 min

Postgres está vacío. Hay que crear las tablas. Lo hacemos desde tu Mac (sirve el conexión a Neon).

1. En tu terminal, en la carpeta del proyecto:
   ```bash
   cd /Users/fernandoisasti/dev/superapp-hogar
   DATABASE_URL="<el string que copiaste de Neon>" \
     pnpm --filter @superapp/database exec prisma migrate deploy
   ```

2. Te debe decir `2 migrations found` o similar y `All migrations have been successfully applied`.

3. Crear tu usuario admin:
   ```bash
   DATABASE_URL="<el string de Neon>" \
   ADMIN_EMAIL="tu@email.com" \
   ADMIN_PASSWORD="ElegiUnaPasswordDeAlMenos12Chars!" \
   ADMIN_FIRST_NAME="Fernando" \
   ADMIN_LAST_NAME="Isasti" \
     pnpm --filter @superapp/database db:seed:prod
   ```

4. Te debe decir `✓ Admin creado: tu@email.com`.

**Avisame y los corro yo por vos** (necesito el string de Neon).

---

## Paso 6 — Conectar Web ↔ API — 1 min

Cuando ambos servicios estén deployados:

1. En **Render** (API service): tab **"Environment"** → editás `ALLOWED_ORIGINS` con la URL exacta de Vercel:
   ```
   ALLOWED_ORIGINS=https://superapp-hogar.vercel.app
   ```
   Render redeploya solo en ~30 segundos.

2. En **Vercel** (web project): **Settings** → **Environment Variables** → editás `NEXT_PUBLIC_API_URL` con la URL real de Render:
   ```
   NEXT_PUBLIC_API_URL=https://superapp-api.onrender.com
   ```
3. En Vercel: **Deployments** → último → click "..." → **"Redeploy"** (para que tome la nueva env var).

---

## Paso 7 — Probarla ✨

Andá a la URL de Vercel (ej: `https://superapp-hogar.vercel.app`).

**Primera vez en ese día:** vas a notar que el primer login tarda ~30 segundos. Es porque Render despertó la API. Después es instantáneo durante 15 minutos.

Logueate con el admin que creaste. Probá publicar inmuebles, registrar otros usuarios, etc.

---

## Resumen — qué te toca a vos AHORA

1. ✅ **Crear cuenta Neon**: https://neon.tech (con GitHub) → copiar connection string
2. ✅ **Crear cuenta Render**: https://render.com/register (con GitHub) → no pide tarjeta
3. ✅ **Crear cuenta Vercel**: https://vercel.com/signup (con GitHub) → no pide tarjeta

Cuando tengas las **3 cuentas creadas y me pases el connection string de Neon**, te guío paso a paso.

---

## ¿Por qué este stack y no otro?

| Servicio | Tier gratis | Tarjeta | Detalles |
|---|---|---|---|
| **Vercel** | ✅ 100 GB/mes | ❌ No | Web no duerme. Perfecto. |
| **Render** | ✅ 750 hs/mes (1 servicio) | ❌ No | API duerme tras 15 min inactivo |
| **Neon** | ✅ 3 GB DB | ❌ No | Postgres no duerme nunca |

Otras opciones evaluadas:
- ❌ **Railway**: $5 gratis pero después pide tarjeta
- ❌ **Fly.io**: pide tarjeta de entrada
- ❌ **AWS/GCP/Azure**: piden tarjeta, complejo de configurar

Si en el futuro querés que la API no duerma, podés:
- Pagar Render Starter ($7/mes)
- Usar un servicio externo gratis como **UptimeRobot** que le pegue cada 14 min y la mantenga despierta
