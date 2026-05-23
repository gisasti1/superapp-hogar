# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

# Copiamos sólo los package.json para aprovechar cache de Docker en pnpm install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Permitimos scripts post-install necesarios (bcrypt, prisma)
RUN pnpm install --frozen-lockfile

# Ahora sí: copiamos el código fuente completo
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Orden de build importa:
# 1) Generar Prisma Client
# 2) Compilar @superapp/shared a dist/  (lo necesita database y api)
# 3) Compilar @superapp/database a dist/ (lo necesita api)
# 4) Compilar @superapp/api a dist/
RUN pnpm --filter @superapp/database db:generate
RUN pnpm --filter @superapp/shared build
RUN pnpm --filter @superapp/database build
RUN pnpm --filter @superapp/api build

# Pre-instalar bcrypt binary nativo (algunas imágenes Alpine necesitan rebuild)
RUN cd node_modules/.pnpm/bcrypt@*/node_modules/bcrypt && \
    (npm run install 2>/dev/null || true)

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache wget && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

RUN npm install -g pnpm@10

# Copiamos package.json + lockfile para producir node_modules de producción
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

# Copiamos los dist compilados de cada paquete + Prisma client generado + schema
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# El Prisma Client generado vive en node_modules — lo copiamos desde el builder
# para no tener que regenerar acá (acelera el deploy y evita duplicar binarios).
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nestjs
EXPOSE 4000

ENV PORT=4000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/api/dist/main"]
