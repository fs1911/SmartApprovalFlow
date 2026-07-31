# syntax=docker/dockerfile:1
#
# API images (Block 19, slimmed in Block 23). Build context is the REPO ROOT
# (monorepo workspaces). Two targets share the heavy `deps`/`build` layers:
#   - target `runtime` (default): the slim API image (production deps only),
#       started via `tsx`. Used by the `api` service.  →  saf-api
#   - target `migrate`: keeps the full deps (incl. the Prisma CLI) so it can run
#       `prisma migrate deploy` + seed. Used by the one-shot `migrate` service. → saf-migrate
#
#   docker build -f apps/api/Dockerfile --target runtime -t saf-api .
#   docker build -f apps/api/Dockerfile --target migrate -t saf-migrate .

# --- deps: install once, cached on the manifest set -------------------------
FROM node:22-slim AS deps
WORKDIR /app
# Prisma's engines need libssl; node:*-slim (Debian) ships without it.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/e2e/package.json apps/e2e/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

# --- build: bring in the source and generate the Prisma client --------------
FROM deps AS build
COPY . .
RUN npm run db:generate

# --- shared runtime base (non-root, libssl) ---------------------------------
FROM node:22-slim AS base-runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --uid 10001 appuser

# --- migrate: full deps (Prisma CLI + tsx) for `migrate deploy` + seed -------
FROM base-runtime AS migrate
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages ./packages
RUN chown -R appuser /app
USER appuser
# The concrete command (prisma migrate deploy + seed) is supplied by compose.
CMD ["node", "-e", "console.error('Provide a command (e.g. prisma migrate deploy).'); process.exit(1)"]

# --- prune: drop dev dependencies for the slim API image --------------------
FROM build AS prune
RUN npm prune --omit=dev

# --- runtime: slim API image (production deps only), runs via tsx -----------
FROM base-runtime AS runtime
# Production node_modules (dev deps pruned: no typescript/prisma CLI/@types).
COPY --from=prune /app/node_modules ./node_modules
# Overlay the generated Prisma client + query engine so a prune can never strip it.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prune /app/package.json ./package.json
COPY --from=prune /app/apps/api ./apps/api
COPY --from=prune /app/packages ./packages
RUN chown -R appuser /app
USER appuser

EXPOSE 4000
# Liveness probe against the built-in health endpoint (node 22 has global fetch).
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "--workspace", "@saf/api"]
