# Block 9 — Summary (Qualitäts- & Betriebsreife)

Baut auf Block 1–8 auf, ohne Kernflows umzubauen. Ziel: Betriebsreife —
automatisierte Tests + CI, Observability-Grundlage, Retention-/Cleanup-Jobs,
Performance-/Pagination-Feinschliff und A11y/UX-Polish. Alles lokal ohne externe
Live-Accounts.

## 1. Was gebaut wurde

### Tests & CI
- **Integrationstests** gegen die echte App via Fastify `inject`
  (`src/test/{helpers,integration}.test.ts`): Health/Readiness, Fall anlegen,
  RBAC-Verweigerung (VIEWER/TECHNICIAN → 403), tenant-sicheres 404, Idempotency
  (Replay + 409), Kundenentscheid ganz **und** pro Position
  (→ `PARTIALLY_APPROVED`), Reminder- und Cleanup-Trigger. Skippen sauber ohne DB.
- **GitHub-Actions-CI** (`.github/workflows/ci.yml`) mit Postgres-16-Service:
  install → generate → migrate → seed → typecheck → build → test. Style-Check
  (Prettier) läuft **informativ** (non-blocking).
- Root-Skripte `npm run test` und `npm run verify` (typecheck + build + test).
- 44 Tests grün (Unit + Integration).

### Observability
- **Fehler-Monitoring-Seam** (`lib/monitoring.ts`): No-Op-Default, real via
  `ERROR_MONITORING`+DSN (`TODO PROVIDER SETUP`); im globalen Error-Handler nur
  für unerwartete 5xx (mit `requestId`/`tenantId`/`route`).
- **Log-Redaction**: `authorization`/`cookie`/`x-saf-sink-secret`/`idempotency-key`
  werden zensiert; optionales `LOG_LEVEL`.
- **Readiness-Probe** `GET /health/ready` mit DB-Check (`SELECT 1`) → 200/503;
  Liveness `GET /health` bleibt DB-frei.

### Retention / Cleanup
- Reine Policy `retentionCutoffs` + `runCleanup(tenantId)` (`lib/retention.ts`):
  abgelaufene Idempotency-Records, terminale Webhook-Deliveries jenseits der
  Frist, verwaiste (nie hochgeladene) Attachments — tenant-scoped, Audit-Trail
  unangetastet. Trigger `POST /maintenance/cleanup` (`members:manage`), kein Cron.
- Additiver Index `attachments(tenantId, uploadedAt)` für die Orphan-Query.

### A11y / UX-Polish
- Kundenseite: `role="alert"` auf Fehlern, `role="status"`/`aria-live` auf dem
  Erfolgszustand, `aria-busy` auf Sende-Buttons, `aria-label`/`aria-pressed` auf
  den Icon-only ✓/✕-Positions-Buttons (`role="group"` je Position).
- Detailseite: beschriftetes Datei-Feld, `role="alert"`, `aria-busy`/`aria-live`.
- (Fokus-Ring + Input-Fokus-Stile waren bereits global vorhanden.)

## 2. Entscheidungen

- **Integrationstests via `inject`** statt echtem Port/Netzwerk — schnell,
  deterministisch; Dev-Header-Auth (nur ausserhalb Produktion) spart JWT-Minting.
- **Trigger-Endpoints statt Scheduler** für Cleanup (wie Reminder) — extern
  taktbar, lokal auslösbar, kein Cron im Produkt.
- **Monitoring als Seam** mit No-Op-Default — kein Zwang zu einem Anbieter, ein
  einziger Meldepunkt.
- **Liveness DB-frei / Readiness DB-geprüft** — ein DB-Ausfall triggert keinen
  Prozess-Neustart, hält aber Traffic zurück.

## 3. Was Mock/Placeholder blieb

- **Lint/Format nicht durchgesetzt:** ESLint ist im Repo nicht funktionsfähig
  (kein installiertes ESLint; Legacy-`eslintrc`-Preset vs. Flat-Config;
  `next lint` uneingerichtet) und Prettier hat repo-weiten Drift. Bewusst
  zurückgestellt, um den Block nicht mit einem Tooling-/Reformat-Umbau zu
  vermischen; CI führt `format:check` informativ. Details + Plan in
  `docs/testing-and-ci.md`.
- Error-Monitoring-Transport ist ein generischer HTTP-POST-Platzhalter
  (`TODO PROVIDER SETUP`), keine echte Sentry-SDK-Anbindung.
- Keine Metriken/Tracing (OpenTelemetry), keine Dashboards.
- Cleanup entfernt DB-Zeilen; Cloud-Objekt-Bytes brauchen später zusätzlich einen
  Bucket-Lifecycle.

## 4. Später nötige Credentials/Accounts

- Für reales Error-Monitoring: `ERROR_MONITORING` + `ERROR_MONITORING_DSN`.
- Für getaktetes Cleanup/Reminder: externer Scheduler + API-Key (`members:manage`).
- CI benötigt keine Secrets (Postgres als Service, console/local Provider).

## 5. Risiken

- Style-Gate ist noch informativ → Stil-/Lint-Regressionen werden nicht
  erzwungen, bis die Tooling-Aufgabe erledigt ist.
- Readiness prüft nur die DB, nicht Storage/E-Mail-Provider (bewusst schlank).
- Retention-Schwellen global pro Tenant; zu aggressive Werte könnten früh löschen
  — Defaults konservativ (30 Tage / 24 h).
- Integrationstests teilen sich die Demo-DB; sie legen nur an, löschen aber nicht
  auf — für CI unkritisch (frische DB je Lauf), lokal wächst die DB langsam.

## 6. Nächster Block

**Block 10 — Onboarding & Self-Service-Aktivierung:** geführtes Werkstatt-
Onboarding (Workspace, Branding, erste Nutzer/Rollen, Beispiel-Fall),
Nutzer-Einladungen + Passwort-Setzen/Reset, Empty-States/In-App-Guidance und eine
schlanke Aktivierungs-/Nutzungsmetrik — weiterhin so weit wie möglich ohne
externe Live-Accounts. Prompt im Handoff.
