# Block 19 — Summary (Containerisierung & reproduzierbares Deployment-Artefakt)

Baut auf Block 1–18 auf, ohne Kernflows umzubauen. Ziel: lauffähige Container-
Artefakte entlang des Runbook-Start-Pfads (Block 18) – zwei Multi-Stage-Images +
eine `docker compose up`-fähige Stack-Definition, lokal ohne externe Accounts.

## 1. Was gebaut wurde

### Images
- **`apps/api/Dockerfile`** – Multi-Stage (deps → build → runtime), non-root,
  `HEALTHCHECK` auf `/api/v1/health`. Startet via `npm run start --workspace
  @saf/api` (= `tsx src/server.ts`); Runtime enthält node_modules (inkl.
  generiertem Prisma-Client) + `apps/api` + `packages`. Build-Kontext = Repo-Root.
- **`apps/web/Dockerfile`** – Multi-Stage, non-root, `HEALTHCHECK` auf `/`.
  `next build` mit build-time `NEXT_PUBLIC_API_BASE_URL` (Build-Arg), Runtime via
  `next start`.
- **`.dockerignore`** – hält node_modules/.next/dist/Secrets/Testartefakte aus dem
  Kontext.

### Stack
- **`docker-compose.yml`** – `db` (Postgres 16, Healthcheck, Volume) →
  `migrate` (one-shot: `prisma migrate deploy` + Seed, `service_completed_
  successfully`) → `api` (Production-Modus) → `web`. Zwei getrennte Base-URLs
  (`NEXT_PUBLIC_API_BASE_URL=http://api:4000` build-time serverseitig vs.
  `API_BASE_URL=http://localhost:4000` runtime für browser-sichtbare Foto-Links)
  – dadurch kein localhost/DNS-Konflikt.

### CI
- Neuer **nicht-blockierender** Job `image-build`: baut beide Images bei jedem
  Push (fängt Dockerfile-Regressionen). App-Gates bleiben `verify` +
  `release-smoke`.

### Doku
- `docs/containerization.md`, dieses Summary; Roadmap + README.

## 2. Entscheidungen

- **Build-Kontext = Repo-Root** – Monorepo-Workspaces; alle Manifeste werden für
  `npm ci` kopiert (Layer-Caching), Quellcode danach.
- **Ein API-Image für `api` + `migrate`** – behält devDependencies (Prisma-CLI),
  vermeidet ein zweites Image. Schlankeres Runtime-Image als späterer Schritt
  notiert.
- **`NEXT_PUBLIC_API_BASE_URL` als Build-Arg** – Next inlined es zur Build-Zeit;
  bewusst getrennt von der runtime `API_BASE_URL` der API.
- **`image-build` non-blocking** – Image-Builds sind langsam; die schnellen,
  deterministischen Gates bleiben führend.

## 3. Was Mock/Placeholder blieb

- Kein Registry-Push / Tagging-Schema (nur Build-Validierung).
- Kein Kubernetes/Helm.
- Seed läuft im Compose-`migrate`-Schritt (Demo-Daten) – für echtes Prod würde
  man den Seed weglassen.

## 4. Später nötige Credentials/Accounts

- Keine für den lokalen Compose-Pfad. Für echtes Prod: `DATABASE_URL`,
  `AUTH_JWT_SECRET` und die Provider-Keys, die der Launch-Guard einfordert.

## 5. Verifikation / Limitierung in dieser Umgebung

- ✅ `docker compose config` valide (4 Services), Dockerfile-Review, unveränderte
  App-Gates (typecheck + 104 API-Tests grün).
- ⚠️ **Kein lokaler `docker build` / `compose up` möglich:** der Agent-Proxy
  verweigert die Docker-Hub-Registry-CDN (`403` auf
  `production.cloudfront.docker.com`) – kein Base-Image (`node:22-slim`,
  `postgres:16`) und nicht einmal das `docker/dockerfile`-Frontend ist ladbar.
  Der eigentliche Image-Build wird vom CI-Job `image-build` abgedeckt (Docker Hub
  auf GitHub-Runnern erreichbar).

## 6. Risiken

- Da der Build lokal nicht lief, ist die erste echte Validierung der CI-Job –
  potenzielle Build-Fehler zeigen sich erst dort (Dockerfiles wurden dafür sorg-
  fältig gereviewt: Kontext, COPY-Reihenfolge, non-root-chown, Healthcheck-fetch).
- Compose-Seed schreibt Demo-Daten; nicht für Prod gedacht.

## 7. Nächster Block

Kandidaten: **CI-Image-Build härten/veröffentlichen** (Push in eine Registry,
Tag = Git-SHA, `release-smoke` gegen die Container statt gegen den nackten
Node-Prozess), **E2E auf Prod-Build/Container** umstellen, oder der
zurückgestellte **Voice-Layer**. Vorschlag + Prompt im Handoff.
