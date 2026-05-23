# 🚀 Deploy gratis — paso a paso

App en internet con tu dominio, gratis para empezar. Total: ~25 minutos.

Vas a usar 3 servicios gratis:
- **GitHub** para guardar el código
- **Vercel** para hostear la web (lo que ven los usuarios)
- **Railway** para hostear la API + base de datos

---

## Paso 1 — Crear cuenta de GitHub (5 min)

1. Abrí https://github.com/signup
2. Email + contraseña + nombre de usuario (ej: `fernandoisasti`)
3. Confirmá tu email
4. **Avisame cuando esté listo** y te subo el código al instante.

---

## Paso 2 — Crear cuenta en Vercel (3 min)

1. Abrí https://vercel.com/signup
2. Click en **"Continue with GitHub"** (te logueás con tu cuenta de GitHub recién creada)
3. Aceptás permisos
4. Listo, ya tenés cuenta.

---

## Paso 3 — Crear cuenta en Railway (3 min)

1. Abrí https://railway.com (o railway.app)
2. Click en **"Login"** arriba a la derecha
3. **"Login with GitHub"**
4. Aceptás permisos
5. Railway te regala $5 USD de crédito gratis — alcanza para tener la app corriendo varias semanas mientras probás.

> ⚠️ Railway pide tarjeta para uso prolongado, pero los primeros $5 son sin tarjeta. Si querés evitar la tarjeta, podemos usar **Fly.io** o **Render** que también tienen tier gratis (te aviso si querés cambiar).

---

## Paso 4 — Esperar mi push (yo lo hago)

Cuando me digas "ya tengo GitHub creado" yo voy a:
1. Crear un repo nuevo `superapp-hogar` (o el nombre que quieras)
2. Subir todo el código (incluye los 6 commits de avance que hicimos)
3. Avisarte

---

## Paso 5 — Deployar la API en Railway (5 min, todo con clicks)

1. En Railway, click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Elegí el repo `superapp-hogar`
4. Railway detecta el `railway.json` y empieza a buildear con el Dockerfile de API automáticamente
5. **Mientras buildea**, agregás la base de datos:
   - Click **"+ New"** dentro del proyecto
   - **"Database"** → **"Add PostgreSQL"**
   - Railway crea una DB Postgres y la conecta sola
6. Click en el servicio de API → tab **"Variables"** → agregá estas 4 variables:

   ```
   JWT_SECRET=<copiá lo que te diga abajo>
   JWT_REFRESH_SECRET=<copiá lo que te diga abajo>
   NODE_ENV=production
   ALLOWED_ORIGINS=https://TU-APP.vercel.app
   ```

   Para generar los secretos, ejecutá esto en tu Mac (Terminal):
   ```bash
   openssl rand -hex 64    # JWT_SECRET
   openssl rand -hex 64    # JWT_REFRESH_SECRET (otro distinto)
   ```

7. Railway redeploya solo. Click en **"Settings"** → **"Networking"** → **"Generate Domain"**. Te va a dar una URL tipo `superapp-api.up.railway.app`.

8. Ahora aplicá las migraciones (una sola vez):
   - Tab **"Settings"** → **"Service"** → buscar **"Custom Start Command"**
   - Cambiar temporalmente a:
     ```
     npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma && node apps/api/dist/main
     ```
   - Guardás, Railway redeploya, las migraciones corren, la API arranca.

9. **Crear el admin** (una sola vez):
   - Tab **"Variables"** → temporalmente agregá:
     ```
     ADMIN_EMAIL=tu@email.com
     ADMIN_PASSWORD=ELEGÍ_UNA_PASSWORD_DE_AL_MENOS_12_CHARS
     ADMIN_FIRST_NAME=Fernando
     ADMIN_LAST_NAME=Isasti
     ```
   - Tab **"Deployments"** → último deployment → **"View Logs"** → arriba derecha **"..."** → **"Restart"**
   - Logs van a mostrar `✓ Admin creado: tu@email.com`
   - (Después podés borrar las env vars `ADMIN_*` — ya no se usan)

---

## Paso 6 — Deployar la Web en Vercel (3 min)

1. En Vercel, click **"Add New..."** → **"Project"**
2. Elegí el repo `superapp-hogar`
3. **Root Directory**: click "Edit" → escribir `apps/web` → Continue
4. Vercel detecta Next.js solo. NO toques nada de Build settings.
5. **Environment Variables**: agregar una sola:
   ```
   NEXT_PUBLIC_API_URL = https://superapp-api.up.railway.app
   ```
   (la URL que Railway te dio en el paso 5.7, **sin barra al final**)
6. Click **"Deploy"**
7. En ~2 min te da la URL: `superapp-hogar.vercel.app` (o algo así)

---

## Paso 7 — Conectar Web ↔ API (1 min)

Tu app web (Vercel) intenta hablar con la API (Railway). Para que el navegador no bloquee por CORS:

1. Vas de vuelta a Railway → API service → **"Variables"**
2. Editá `ALLOWED_ORIGINS` con la URL exacta de Vercel:
   ```
   ALLOWED_ORIGINS=https://superapp-hogar.vercel.app
   ```
3. Railway redeploya solo en ~30 segundos.

**Listo.** Tu app está en internet.

---

## Paso 8 — Probarla (¡el momento!)

Andá a `https://superapp-hogar.vercel.app` (la URL que te dio Vercel), entrá con el email/password del admin que creaste en el paso 5.9. Probá registrar otro usuario, publicar inmuebles, todo el flujo.

---

## Bonus: dominio propio (opcional, ~$15/año)

1. Comprá un dominio en NIC.ar (`.com.ar`) o Namecheap (`.com`)
2. En Vercel: Settings → Domains → agregá tu dominio → seguí instrucciones (cambiás 2 DNS records)
3. En Railway: Settings → Domains → agregá `api.tu-dominio.com` → mismo (1 DNS record)
4. Actualizás `ALLOWED_ORIGINS` y `NEXT_PUBLIC_API_URL` con los dominios nuevos
5. HTTPS automático en ambos.

---

## Resumen: qué te toca hacer ahora

1. ✅ Crear cuenta en https://github.com/signup
2. ✅ Cuando estés listo, decime: **"ya tengo GitHub, mi usuario es: XXX"**
3. Yo subo el código al instante
4. Vos seguís el paso 5 en adelante con clicks

¿Vamos? Empezá por GitHub.
