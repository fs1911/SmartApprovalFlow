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

### API — `apps/api/Dockerfile` (zwei Targets, Block 23)
```bash
docker build -f apps/api/Dockerfile --target runtime -t saf-api .    # schlankes API-Image
docker build -f apps/api/Dockerfile --target migrate -t saf-migrate . # Migrations-Image
```
Gemeinsame `deps`/`build`-Layer (npm ci + `db:generate`), dann zwei Targets:

- **`runtime`** (Default, → `saf-api`): **schlank** — `npm prune --omit=dev`
  entfernt Dev-Dependencies (TypeScript, Prisma-CLI, `@types`, …); behalten
  bleiben `tsx` (Runtime-Dep), `@prisma/client` + `openssl`. Der generierte
  Prisma-Client (`node_modules/.prisma`) wird zusätzlich aus dem `build`-Stage
  überkopiert, damit ihn ein Prune nie entfernt. Start via
  `npm run start --workspace @saf/api` (= `tsx src/server.ts`). Healthcheck:
  `GET /api/v1/health`.
- **`migrate`** (→ `saf-migrate`): **volle** Deps inkl. Prisma-CLI, damit der
  one-shot `migrate`-Service `prisma migrate deploy` + Seed fahren kann. Das
  API-Image bleibt dadurch schlank.

Beide teilen die teuren Layer (npm ci, generate) — kein doppelter schwerer Build.

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

## Versionierung / Tagging (Block 20)

`APP_VERSION` steuert sowohl die **Image-Tags** als auch die **von der API
gemeldete Version**:

- lokal ungesetzt → Tags `saf-api:dev` / `saf-web:dev`, `/api/v1/health` meldet
  `version: "dev"`;
- in CI = Commit-SHA → Tags `saf-api:<sha>` / `saf-web:<sha>`, `/api/v1/health`
  meldet `version: "<sha>"`.

So lässt sich am laufenden Container zweifelsfrei ablesen, welcher Build bedient
wird:

```bash
APP_VERSION=$(git rev-parse HEAD) docker compose up --build -d
curl -s localhost:4000/api/v1/health   # → "version":"<sha>"
```

## CI

`.github/workflows/ci.yml` → Job **`container-smoke`** (nicht-blockierend, ersetzt
den früheren reinen `image-build`): baut die Images via `docker compose build`
(Tag = Commit-SHA), fährt mit `docker compose up -d` den ganzen Stack hoch,
wartet auf den **Healthy**-Status des API-Containers, führt den Readiness-Smoke
**im API-Container** aus (`docker compose exec api npm run smoke …`), prüft, dass
`/api/v1/health` die gebaute Version meldet, und lädt die Web-Startseite. Bei
Fehler werden die Container-Logs ausgegeben; am Ende `docker compose down -v`.

Damit validiert ein einziger Job **Build _und_ Laufzeit** der Container — keine
doppelte, langsame Arbeit. **Gate-Einteilung:**

| Job | Rolle | Blockierend |
| --- | --- | --- |
| `verify` | typecheck + build + node:test | ✅ Gate |
| `release-smoke` | Prod-Start (nackter Node) + Health-Smoke | ✅ Gate |
| `container-smoke` | Images bauen + Stack hochfahren + Smoke | ⬜ non-blocking |
| `e2e` | Playwright + a11y | ⬜ non-blocking |

`container-smoke` bleibt bewusst non-blocking: Container-Builds sind langsam und
lokal (siehe unten) nicht reproduzierbar. Der schnelle, deterministische
`release-smoke` deckt den Start-Pfad bereits als Gate ab.

## Release & Registry-Push (Block 23)

Eigener Workflow **`.github/workflows/release.yml`**, getriggert nur auf
**Version-Tags** (`v*`) oder **manuellem Dispatch** — getrennt von `ci.yml`
(dort baut+smoked `container-smoke` bei jedem Push). Trigger-Übersicht:

| Workflow / Job | Trigger | Tut |
| --- | --- | --- |
| `ci.yml` → `container-smoke` | jeder Push | bauen → hochfahren → smoken (non-blocking) |
| `release.yml` → `images` | Tag `v*` / Dispatch | Images bauen (Tag = Tag-Name/SHA), optional pushen |

Der Build läuft immer; der **Push ist standardmäßig AUS** und wird nur
ausgeführt, wenn die Repo-Variable `ENABLE_REGISTRY_PUSH == 'true'` gesetzt ist.
So braucht der Default-Pfad **kein Secret**. Zum Aktivieren (**TODO PROVIDER
SETUP**):

1. Repo-Variable `ENABLE_REGISTRY_PUSH=true` setzen.
2. Variablen `REGISTRY_HOST` (z. B. `ghcr.io`) + `REGISTRY_NAMESPACE` (z. B. die
   Org) setzen.
3. Secrets `REGISTRY_USER` + `REGISTRY_TOKEN` hinterlegen.

Der Workflow taggt dann `saf-api` / `saf-web` / `saf-migrate` auf
`<host>/<namespace>/<image>:<version>` und pusht sie. Secrets gehören in die
CI-Secret-Verwaltung, nie ins Repo.

## Lokal in dieser Umgebung nicht ausführbar

Der Docker-Daemon läuft in dieser Managed-Umgebung zwar (v29, BuildKit), aber der
**Agent-Proxy verweigert die Docker-Hub-Registry-CDN** (`403` auf
`production.cloudfront.docker.com`), sodass **kein Base-Image** (`node:22-slim`,
`postgres:16`) und nicht einmal das `docker/dockerfile`-Frontend geladen werden
kann. Deshalb wurde hier **verifiziert**:

- `docker compose config` (valide; Tag-/`APP_VERSION`-Interpolation für `dev` und
  SHA geprüft),
- Dockerfile-/Compose-/CI-Logik per Review,
- unveränderte App-Gates (typecheck + Tests grün).

**Nicht** lokal ausführbar waren `docker build` / `docker compose up` und damit
der `container-smoke`-Ablauf — das deckt der CI-Job ab (auf GitHub-Runnern ist
Docker Hub erreichbar).

## Bewusst offen

- Registry-Push ist vorbereitet, aber standardmäßig deaktiviert (opt-in per
  `ENABLE_REGISTRY_PUSH`); kein Live-Push in diesem Repo verifiziert.
- Kein Kubernetes/Helm; Compose deckt den lokalen/Single-Host-Fall ab.
- Kein Multi-Arch-Build.
