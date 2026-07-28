# syntax=docker/dockerfile:1
#
# API image (Block 19). Build context is the REPO ROOT (monorepo workspaces):
#   docker build -f apps/api/Dockerfile -t saf-api .
#
# The API runs via `tsx` against TypeScript source (the shared @saf/* packages
# are consumed as source — see docs/release-and-deployment-runbook.md), so the
# runtime image ships the source + node_modules (incl. the generated Prisma
# client), not a compiled dist.

# --- deps: install once, cached on the manifest set -------------------------
FROM node:22-slim AS deps
WORKDIR /app
# Copy every workspace manifest so `npm ci` can resolve the workspace tree.
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

# --- runtime: lean, non-root ------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Only what the API needs at runtime: deps (with the generated client), the
# API source, and the shared packages. The web app is intentionally excluded.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages

# Drop privileges.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser /app
USER appuser

EXPOSE 4000
# Liveness probe against the built-in health endpoint (node 22 has global fetch).
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "--workspace", "@saf/api"]
