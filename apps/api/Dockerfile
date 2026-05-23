# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

# Copiamos sólo los package.json para aprovechar cache de Docker en pnpm install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install completo (incluye devDeps necesarias para build)
RUN pnpm install --frozen-lockfile

# Código fuente
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Orden importa:
# 1) Prisma client → 2) shared → 3) database → 4) api
RUN pnpm --filter @superapp/database db:generate
RUN pnpm --filter @superapp/shared build
RUN pnpm --filter @superapp/database build
RUN pnpm --filter @superapp/api build

# Después del build podemos prunear devDeps para reducir el image final
RUN pnpm prune --prod || true

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache wget && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copiamos el árbol entero compilado del builder. Más simple y a prueba de
# las particularidades de los symlinks de pnpm: en lugar de re-instalar en
# el runner, reutilizamos exactamente lo que ya quedó compilado.
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/package.json ./packages/database/
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

USER nestjs
EXPOSE 4000

CMD ["node", "apps/api/dist/main"]
