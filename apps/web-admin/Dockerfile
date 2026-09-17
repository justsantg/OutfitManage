# syntax=docker/dockerfile:1
# Imagen Next.js (web-admin) en modo standalone. Contexto de build: raíz del monorepo.
FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web-admin/package.json apps/web-admin/
COPY packages/api-client/package.json packages/api-client/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store     pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /repo /repo
COPY . .
# NEXT_PUBLIC_* se inserta en el bundle en build-time: se pasa como build-arg.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CATALOGO_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CATALOGO_URL=$NEXT_PUBLIC_CATALOGO_URL
ENV BUILD_STANDALONE=1
RUN pnpm --filter @core/api-client build && pnpm --filter web-admin build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
# El output standalone trae su propio server.js y solo las deps necesarias.
COPY --from=build --chown=app:app /repo/apps/web-admin/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=build --chown=app:app /repo/apps/web-admin/public ./apps/web-admin/public
USER app
CMD ["node", "apps/web-admin/server.js"]
