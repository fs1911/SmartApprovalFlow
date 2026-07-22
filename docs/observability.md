# Observability (Block 9)

Grundlage für den Betrieb: strukturiertes Logging mit Korrelation, ein
Fehler-Monitoring-Seam und Health/Readiness-Probes. Alles läuft ohne externe
Accounts; reale Backends werden per ENV angebunden.

## Logging

- **Strukturiert** über pino (Fastify-Logger). Level aus `LOG_LEVEL` oder sonst
  aus `NODE_ENV` abgeleitet (`info` in Produktion, `debug` sonst).
- **Korrelation:** jede Antwort trägt `X-Request-Id` (aus dem eingehenden Header
  übernommen oder generiert); dieselbe ID steht in jedem Fehler-Envelope
  (`error.requestId`) und in den Log-Records (`reqId`).
- **Redaction:** sensible Felder werden nie geloggt — `authorization`- und
  `cookie`-Header, `x-saf-sink-secret` und `idempotency-key` werden zu
  `[redacted]` zensiert (siehe `app.ts`).

## Fehler-Monitoring (Seam)

`apps/api/src/lib/monitoring.ts` bietet **einen** Ort, um unerwartete Fehler an
einen externen Monitor zu melden:

- Default `ERROR_MONITORING=none` → **No-Op** (der globale Error-Handler loggt
  weiterhin strukturiert). Nichts Externes nötig.
- `ERROR_MONITORING=sentry|http` + `ERROR_MONITORING_DSN` → best-effort,
  fire-and-forget POST an die Ingest-URL. Ohne DSN degradiert der Code sicher auf
  No-Op (mit Warnung). Konkrete Payload-Form: `TODO PROVIDER SETUP`.

Eingehängt im globalen Error-Handler: nur **unerwartete 5xx** werden gemeldet
(mit `requestId`, `tenantId`, `route`), erwartete 4xx nicht.

## Health / Readiness

| Endpoint | Zweck | DB? |
| --- | --- | --- |
| `GET /api/v1/health` | Liveness — Prozess läuft | nein |
| `GET /api/v1/health/ready` | Readiness — Prozess **und** DB erreichbar | ja (`SELECT 1`) |

`/health/ready` antwortet `200` mit `checks.database.ok` + Latenz, oder `503`
`SERVICE_UNAVAILABLE`, wenn die DB nicht erreichbar ist — so hält ein
Orchestrator (K8s/Fly/…) Traffic zurück, bis Abhängigkeiten stehen. Liveness
bleibt bewusst DB-frei, damit ein DB-Ausfall nicht den Prozess-Neustart auslöst.

## Deferred

- Metriken/Tracing (OpenTelemetry) sind noch nicht integriert.
- Log-Drain/Dashboards sind Betriebsentscheidungen (Block-6-Zielbild).
