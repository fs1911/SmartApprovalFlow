# Deployment

Betriebsmodell für Dev, Staging und Production. Ziel: reproduzierbar, mit klarer
Trennung von Config und Secrets, ohne Overengineering.

## Umgebungen

| Aspekt | Development | Staging | Production |
| --- | --- | --- | --- |
| `NODE_ENV` | development | production | production |
| Postgres | lokal | Supabase (Staging-Projekt) | Supabase (Prod-Projekt) |
| E-Mail | `console` | `resend` (Test-Absender) | `resend` (verifizierte Domain) |
| Storage | `local` | `supabase`/`r2` (Test-Bucket) | `supabase`/`r2` (Prod-Bucket) |
| Auth | Dev-Stub | Dev-Stub → echt (Block 7) | echt (Block 7) |
| Base-URLs | localhost | staging-Domains | Prod-Domains |
| Logging | pretty/debug | json/info | json/info |
| Secrets | `.env` lokal | Plattform-Secrets | Plattform-Secrets |

Provider werden pro Umgebung über ENV aktiviert (siehe `env-and-secrets.md`).
Fehlt eine Cloud-Credential, degradiert der Code sicher (console/local).

## Build & Run

```bash
# Install (Monorepo)
npm install

# DB-Client + Migrationen
npm run db:generate
npm run db:migrate:deploy   # in CI/Prod: migrate deploy (nicht dev)

# Build
npm run build               # baut apps/web (+ tsc für api, falls genutzt)

# Start
npm run start --workspace apps/api   # node dist/server.js
npm run start --workspace apps/web   # next start
```

Empfehlung: **Web** auf einer Next.js-fähigen Plattform (oder Container),
**API** als Node-Container. Beide sind zustandslos; Zustand liegt in Postgres +
Storage.

## Migrations-Strategie

- **Dev:** `prisma migrate dev` (erzeugt Migrationen).
- **Staging/Prod:** `prisma migrate deploy` (wendet vorhandene Migrationen an,
  erzeugt keine neuen). Migrationen sind versioniert unter
  `packages/db/prisma/migrations` und werden mit dem Code deployt.
- **Seed:** nur Dev/Staging (`npm run seed --workspace packages/db`), niemals
  ungefragt in Production.

## Rollback-Gedanke

- **Code:** vorheriges Image/Deployment erneut ausrollen (immutable Deploys).
- **DB:** additive, rückwärtskompatible Migrationen bevorzugen (expand/contract),
  damit ein Code-Rollback ohne DB-Rollback möglich bleibt. Destruktive Änderungen
  in zwei Schritten. Vor Prod-Migrationen: Backup/Point-in-Time (Supabase).

## Health / Betrieb

- Liveness/Readiness: `GET /api/v1/health`.
- Korrelation: jede Antwort trägt `X-Request-Id`.
- Konfiguration wird beim Boot validiert (fail fast bei fehlerhafter ENV).

## TODO PROVIDER SETUP / TODO INFRA DECISION

- Konkrete Hosting-Plattform (Web/API) final wählen.
- Supabase-Projekte (Staging/Prod) + Connection-Strings anlegen.
- Cloudflare-Zone + Domains/Subdomains + TLS.
- Resend-Domain verifizieren; Storage-Bucket anlegen.
- CI-Pipeline (Build → migrate deploy → Deploy).
