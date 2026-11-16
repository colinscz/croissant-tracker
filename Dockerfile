# syntax=docker/dockerfile:1

# Croissant Tracker — one Dockerfile, two images:
#
#   docker build --target app     -t croissant-tracker:latest .          (the Nuxt server)
#   docker build --target migrate -t croissant-tracker-migrate:latest .  (one-shot DB migrations)
#
# docker-compose.yml builds both. `app` is the last stage, so it's also what a
# plain `docker build .` produces.

ARG NODE_VERSION=24
ARG PNPM_VERSION=11.5.2

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    NUXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /src

# Dependencies first, so source edits don't bust the install layer. Lifecycle
# scripts are skipped here because `postinstall` (nuxt prepare) needs the source;
# `nuxt build` runs the same preparation itself.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build && pnpm db:bundle

# ---------------------------------------------------------------------------
# Applies server/db/migrations as the schema owner, then exits. A self-contained
# bundle (drizzle-orm + postgres inlined): no node_modules in this image.
FROM node:${NODE_VERSION}-alpine AS migrate
WORKDIR /migrate
COPY --from=build /src/dist/migrate.mjs ./migrate.mjs
COPY --from=build /src/server/db/migrations ./migrations
ENV NODE_ENV=production \
    MIGRATIONS_DIR=/migrate/migrations
USER node
CMD ["node", "migrate.mjs"]

# ---------------------------------------------------------------------------
# The Nuxt/Nitro server. `.output` is self-contained (Nitro traces and copies
# the runtime dependencies it needs), so nothing else from the build is copied.
FROM node:${NODE_VERSION}-alpine AS app
WORKDIR /app
COPY --from=build --chown=node:node /src/.output ./.output
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
