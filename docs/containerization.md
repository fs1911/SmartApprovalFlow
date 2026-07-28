# Containerisierung (Block 19)

Container-Artefakte entlang des Start-Pfads aus
`docs/release-and-deployment-runbook.md`: je ein Multi-Stage-Image für API und
Web plus eine `docker-compose.yml`, die alles lokal ohne externe Accounts
hochzieht (Postgres + Migration/Seed + API + Web, console-E-Mail + local-Storage).

## Schnellstart

```bash
docker compose up --build
# → API  http://localhost:4000  (Docs: /docs, Health: /api/v1/health)
# → Web  http://localhost:3000
```

`docker compose up` startet Postgres, wartet auf dessen Health, wendet dann im
`migrate`-Service `prisma migrate deploy` an und seedet den Demo-Mandanten,
danach starten API (Production-Modus) und Web.

Readiness-Smoke gegen die laufende API (vom Host):

```bash
API_BASE_URL=http://localhost:4000 npm run smoke --workspace @saf/api
```

## Images

Beide Images bauen aus dem **Repo-Root** als Kontext (Monorepo-Workspaces) und
sind Multi-Stage, non-root, mit `HEALTHCHECK`.

### API — `apps/api/Dockerfile`
```bash
docker build -f apps/api/Dockerfile -t saf-api .
```
- `deps` → `npm ci` (alle Workspace-Manifeste kopiert, damit npm den Tree auflöst)
- `build` → Quellcode + `npm run db:generate` (Prisma-Client)
- `runtime` → node_modules (inkl. generiertem Client) + `apps/api` + `packages`;
  Start via `npm run start --workspace @saf/api` (= `tsx src/server.ts`, siehe
  Runbook, warum kein `node dist`).
- Healthcheck: `GET /api/v1/health`.
- **Bewusst mit devDependencies:** dasselbe Image dient auch dem `migrate`-Service,
  der die Prisma-CLI braucht. Ein separates schlankes Runtime-Image wäre ein
  späterer Optimierungsschritt.

### Web — `apps/web/Dockerfile`
```bash
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_BASE_URL=http://api:4000 -t saf-web .
```
- `deps` → `npm ci`
- `build` → `next build` mit **build-time** `NEXT_PUBLIC_API_BASE_URL`
- `runtime` → `.next` + node_modules + `packages`; Start via `next start`.
- Healthcheck: Startseite `GET /` == 200.

## Zwei Base-URLs (kein Konflikt)

| Variable | Kontext | Wert in Compose | Wozu |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | **Build-time**, Web-Server → API (serverseitige Fetches) | `http://api:4000` | Next inlined es; die Kundenseite lädt/entscheidet serverseitig |
| `API_BASE_URL` | **Runtime**, API selbst | `http://localhost:4000` | baut browser-sichtbare Foto-Download-Links (local-Storage) |

Weil beide getrennt sind, funktioniert sowohl der serverseitige Web→API-Aufruf
(über das Compose-Netz) als auch das browserseitige Laden der Foto-URLs (über den
auf dem Host veröffentlichten API-Port).

## ENV-Übergabe

Images bekommen Config ausschließlich über **Runtime-ENV** (nie eingebacken),
Ausnahme ist das build-time `NEXT_PUBLIC_*`. In Production greift der
Launch-Guard der API (siehe Runbook): fehlt `DATABASE_URL`/`AUTH_JWT_SECRET` oder
ist ein gewählter Provider unvollständig, startet der Container nicht. Das in
`docker-compose.yml` hinterlegte `AUTH_JWT_SECRET` ist ein **Wegwerf-Wert nur für
lokal** (erfüllt nur die 32-Zeichen-Prüfung) — niemals wiederverwenden.

## CI

`.github/workflows/ci.yml` → Job **`image-build`** (nicht-blockierend): baut beide
Images bei jedem Push, damit Dockerfile-Regressionen auffallen. Die
App-Gates bleiben `verify` + `release-smoke`.

## Lokal in dieser Umgebung nicht ausführbar

Der Docker-Daemon läuft in dieser Managed-Umgebung zwar (v29, BuildKit), aber der
**Agent-Proxy verweigert die Docker-Hub-Registry-CDN** (`403` auf
`production.cloudfront.docker.com`), sodass **kein Base-Image** (`node:22-slim`,
`postgres:16`) und nicht einmal das `docker/dockerfile`-Frontend geladen werden
kann. Deshalb wurde hier **verifiziert**:

- `docker compose config` (Compose-Datei valide, 4 Services aufgelöst),
- Dockerfile-Struktur/Logik per Review,
- unveränderte App-Gates (typecheck + Tests grün).

**Nicht** lokal ausführbar war der eigentliche `docker build` / `docker compose
up` — das deckt der CI-Job `image-build` ab (auf GitHub-Runnern ist Docker Hub
erreichbar).

## Bewusst offen

- Kein Registry-Push / kein Image-Tagging-Schema (nur Build zur Validierung).
- Kein Kubernetes/Helm; Compose deckt den lokalen/Single-Host-Fall ab.
- API-Image trägt devDependencies (geteilt mit `migrate`); separates schlankes
  Runtime-Image ist ein möglicher späterer Schritt.
