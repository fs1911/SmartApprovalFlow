# Release- & Deployment-Runbook (Block 18)

Konkreter, reproduzierbarer Weg von „Code" zu „laufender Prod-Instanz" plus die
Guardrails, die eine fehlkonfigurierte Instanz gar nicht erst starten lassen.
Ergänzt `docs/deployment.md` (Zielbild) und `docs/env-and-secrets.md` (Variablen).

## Überblick

Zwei zustandslose Prozesse, Zustand liegt in Postgres + Storage:

| Dienst | Build | Start (Production) |
| --- | --- | --- |
| API (`apps/api`) | `npm run build --workspace @saf/api` (tsc, Compile-Check) | `npm run start --workspace @saf/api` → `tsx src/server.ts` |
| Web (`apps/web`) | `npm run build --workspace @saf/web` (`next build`) | `npm run start --workspace @saf/web` → `next start` |

**Warum die API über `tsx` startet:** Die geteilten Pakete (`@saf/types`,
`@saf/db`, `@saf/ui`) werden als TypeScript-Quelle konsumiert (ihr `main` zeigt
auf `src/index.ts`). Ein reiner `node dist/server.js`-Start scheitert deshalb an
diesen Workspace-Importen. `tsx` (esbuild-basiert, als **Runtime**-Dependency
geführt) löst das ohne die Paket-Build-Kette umzubauen. Der `tsc`-Build bleibt
als Compile-Validierung Teil von `verify`/CI. (Ein späterer Block kann die Pakete
vorkompilieren, um die tsx-Runtime-Abhängigkeit abzulösen.)

## Schritt für Schritt (Staging/Prod)

```bash
# 1. Install (deterministisch)
npm ci

# 2. Prisma-Client + Migrationen (nie `migrate dev` in Prod)
npm run db:generate
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

# 3. Build (Compile-Check API + Next-Build Web)
npm run build

# 4. Start (getrennte Prozesse/Container)
NODE_ENV=production npm run start --workspace @saf/api   # Port 4000
NODE_ENV=production npm run start --workspace @saf/web   # Port 3000

# 5. Readiness-Smoke gegen die gestartete API
API_BASE_URL=http://localhost:4000 npm run smoke --workspace @saf/api
```

Seed (`npm run seed --workspace packages/db`) nur in Dev/Staging, **nie** in Prod.

## Production-Launch-Guard (fail fast)

`apps/api/src/config.ts` prüft beim Boot in `NODE_ENV=production` und **bricht mit
klarer Meldung ab**, wenn:

- `DATABASE_URL` fehlt,
- `AUTH_JWT_SECRET` der Dev-Default oder < 32 Zeichen ist,
- ein **aktiv gewählter** Provider unvollständig ist:
  - `EMAIL_PROVIDER=resend` ohne `RESEND_API_KEY`
  - `STORAGE_DRIVER=supabase` ohne `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
  - `STORAGE_DRIVER=r2` ohne die drei `R2_*`-Werte
  - `BILLING_PROVIDER=stripe` ohne `STRIPE_SECRET_KEY`
  - `ERROR_MONITORING` ≠ `none` ohne `ERROR_MONITORING_DSN`

**Warnungen** (Start läuft trotzdem, aber vermutlich unerwünscht in Prod):
`EMAIL_PROVIDER=console`, `STORAGE_DRIVER=local`, Default-`BILLING_WEBHOOK_SECRET`.

In Dev/Test sind all diese Prüfungen inert — lokal startet alles ohne Setup.

## Health- / Readiness-Probes

| Endpoint | Zweck | Erfolg |
| --- | --- | --- |
| `GET /api/v1/health` | Liveness (Prozess up, kein DB-Zugriff) | `200`, `data.status = "ok"` |
| `GET /api/v1/health/ready` | Readiness (inkl. `SELECT 1`) | `200`, `data.status = "ready"`, `checks.database.ok = true` |

`/health/ready` liefert bei nicht erreichbarer DB `503` — Orchestratoren halten
die Instanz so aus der Rotation. Beide melden `version` (aus `APP_VERSION`,
Default `1.0.0`) — praktisch, um das ausgerollte Release zu verifizieren.

## Readiness-Smoke

`npm run smoke --workspace @saf/api [-- <baseUrl>]` (Skript:
`apps/api/src/scripts/smoke.ts`) prüft Liveness **und** Readiness und endet mit
Exit-Code ≠ 0, wenn etwas ungesund ist. Es wiederholt mit kurzem Backoff
(`SMOKE_ATTEMPTS`, `SMOKE_DELAY_MS`), um Cold-Start-Latenz zu überbrücken —
ideal direkt nach dem Start. Base-URL: Argument → `SMOKE_BASE_URL` →
`API_BASE_URL` → `http://localhost:4000`.

## CI

`.github/workflows/ci.yml` hat drei Jobs:

- **`verify`** (Haupt-Gate): typecheck + build + node:test + Format-Check (info).
- **`e2e`** (nicht-blockierend): Playwright + a11y-Smoke der Kundenseite.
- **`release-smoke`** (Gate): startet die API im **Production-Modus** gegen einen
  Postgres-Service und lässt den Readiness-Smoke laufen. Genau dieser Job fängt
  einen kaputten Prod-Start-Pfad ab, den Unit-Tests nicht sehen.

## Rollback

Da Start zustandslos ist: vorheriges Image/Commit erneut deployen. Migrationen
sind additiv ausgelegt; ein Schema-Rollback erfordert eine bewusste
Down-Migration und ist selten nötig. Immer zuerst den Readiness-Smoke gegen die
neu gestartete Instanz laufen lassen, bevor Traffic umgeschaltet wird.

## Bewusst offen

- Kein Container-/IaC-Artefakt in diesem Block (Zielbild in `deployment.md`);
  Fokus ist der verlässliche Build-/Start-/Smoke-Pfad.
- API-Runtime nutzt `tsx`; Paket-Vorkompilierung ist ein optionaler späterer
  Schritt.
