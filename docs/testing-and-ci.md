# Testing & CI (Block 9)

## Teststrategie

Zwei Ebenen, beide mit dem eingebauten `node:test`-Runner (keine zusätzliche
Test-Runner-Abhängigkeit):

1. **Unit-Tests** (rein, ohne I/O) für die Kernlogik:
   State-Machine/Aggregation (`status.test.ts`, `attachments.test.ts`),
   Reminder-Policy (`reminders.test.ts`), Retention-Cutoffs & Monitoring-Resolver
   (`retention.test.ts`), Pagination/Templates/Permissions/Schemas/Auth.
   Diese laufen **ohne Datenbank**.
2. **Integrationstests** gegen die echte App via Fastify `inject`
   (`src/test/integration.test.ts`, Helfer in `src/test/helpers.ts`): sie fahren
   die Kern-Journeys durch — Health/Readiness, Fall anlegen, RBAC-Verweigerung,
   Tenant-sicheres 404, Idempotency (Replay + 409), Kundenentscheid (ganzer Fall
   und pro Position → `PARTIALLY_APPROVED`), Reminder- und Cleanup-Trigger.

Auth in den Integrationstests nutzt den Dev-Header-Stub (nur erlaubt, weil
`NODE_ENV !== 'production'`), sodass keine JWTs gemintet werden müssen. Die Tests
setzen den geseedeten `muster-garage`-Tenant voraus; ohne erreichbare DB
**überspringen** sie sich sauber (`dbAvailable()` → `t.skip`).

## Lokal ausführen

```bash
# Datenbank vorbereiten (einmalig / nach Schemaänderung)
export DATABASE_URL=postgresql://saf:saf@localhost:5432/smart_approval_flow?schema=public
npm run db:generate
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
npm run seed --workspace packages/db     # legt den Demo-Tenant an

# Die komplette Kette (wie in CI, ohne Lint/Format-Gate):
npm run verify        # typecheck + build + test

# Nur Tests:
npm run test --workspace apps/api
```

`npm run verify` = `typecheck && build && test` über alle Workspaces.

## CI (GitHub Actions)

`.github/workflows/ci.yml` spiegelt `verify` und ergänzt einen **Postgres-16-
Service**, damit die Integrationstests gegen eine echte DB laufen:

1. `npm ci`
2. `npm run db:generate`
3. `prisma migrate deploy`
4. `npm run seed` (Demo-Tenant für die Integrationstests)
5. `npm run typecheck`
6. `npm run build`
7. `npm run test`
8. `npm run format:check` — **informativ** (`continue-on-error`), blockiert nicht.

Läuft ohne externe Accounts (console-E-Mail, local-Storage, DB als Service).

## Deferred: Lint & Format-Enforcement

ESLint ist im Repo aktuell **nicht funktionsfähig** (kein installiertes ESLint,
das `packages/config/eslint-preset.cjs`-Preset ist Legacy-`eslintrc`, während die
Zielversion Flat-Config erwartet; `apps/web` nutzt ein nicht eingerichtetes
`next lint`). Prettier ist verfügbar, aber repo-weit noch nicht durchgesetzt
(Formatierungs-Drift in vielen Bestandsdateien).

Bewusst als Aufgabe zurückgestellt, um den Block-9-Diff nicht mit einem
repo-weiten Reformat/Tooling-Umbau zu vermischen. Nächster Schritt (eigener,
isolierter Change): ESLint-Flat-Config + `eslint-config-next` einrichten, einen
einmaligen `prettier --write .`-Pass fahren und danach `lint`/`format:check` in
CI von *informativ* auf *blockierend* heben.
