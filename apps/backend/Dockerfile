# syntax=docker/dockerfile:1
# Imagen del backend NestJS. Contexto de build: la raíz del monorepo (el backend importa
# @core/api-client vía workspace:*), por eso las rutas copian desde la raíz.
FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

# --- Dependencias (cacheado por manifiestos) ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY packages/api-client/package.json packages/api-client/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build ---
FROM base AS build
COPY --from=deps /repo /repo
COPY . .
RUN pnpm --filter @core/api-client build \
    && pnpm --filter backend exec prisma generate \
    && pnpm --filter backend build \
    && pnpm --filter backend --prod deploy /out

# --- Runtime ---
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Usuario sin privilegios.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /out/dist ./dist
COPY --from=build --chown=app:app /out/node_modules ./node_modules
COPY --from=build --chown=app:app /out/package.json ./package.json
COPY --from=build --chown=app:app /repo/apps/backend/prisma ./prisma
USER app
EXPOSE 3000
# migrate deploy aplica migraciones pendientes antes de arrancar (idempotente).
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main"]
