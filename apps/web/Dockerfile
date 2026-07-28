# syntax=docker/dockerfile:1
#
# Web image (Block 19). Build context is the REPO ROOT (monorepo workspaces):
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=http://api:4000 -t saf-web .
#
# NEXT_PUBLIC_* is inlined at BUILD time by Next.js, so the API base URL the web
# server uses for its server-side fetches is baked here. In docker-compose that
# is the internal service DNS `http://api:4000`. Browser-facing photo URLs come
# from the API's own API_BASE_URL (a separate, host-reachable value), so the two
# never conflict.

# --- deps -------------------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/e2e/package.json apps/e2e/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

# --- build: next build ------------------------------------------------------
FROM deps AS build
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NODE_ENV=production
COPY . .
RUN npm run build --workspace @saf/web

# --- runtime: lean, non-root ------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# Built app (.next), config and the transpiled workspace packages next start needs.
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/packages ./packages

RUN useradd --create-home --uid 10001 appuser && chown -R appuser /app
USER appuser

EXPOSE 3000
# The web app has no dedicated health route; the home page returning 200 is the
# liveness signal.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "--workspace", "@saf/web"]
