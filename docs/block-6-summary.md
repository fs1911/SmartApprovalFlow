# Block 6 — Summary (Infrastruktur & Provider-Readiness)

Baut auf Block 1–5 auf, ohne Architektur oder Kernflows umzubauen. Ziel: ein
sauberes Betriebszielbild und provider-ready Code — **ohne** externe Live-Accounts,
alles lokal mit Dev-/Mock-Fallback lauffähig.

## 1. Was gebaut wurde

### Provider-Adapter (Code)
- **E-Mail/Resend:** `ResendProvider` hinter der bestehenden Notification-
  Abstraktion (`apps/api/src/lib/notifications.ts`). Aktiv mit
  `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`; ohne Key Fallback auf `console`
  (mit Warnung, nie stiller No-Op). Reine HTTP-Anbindung, keine SDK-Abhängigkeit.
- **Storage:** `StorageDriver`-Interface + funktionsfähiger `LocalStorageDriver`
  (Dateisystem, Path-Traversal-Schutz, signierte-URL-Form) und Cloud-Platzhalter
  (`supabase`/`r2`, `UnconfiguredCloudDriver`). Auswahl über `STORAGE_DRIVER`;
  ohne Credentials Fallback auf `local`. (`apps/api/src/lib/storage.ts`)
- Beide Auswahllogiken sind reine, **getestete** Funktionen
  (`resolveEmailProviderName`, `resolveStorageDriverName`).

### ENV/Secrets-Härtung
- `apps/api/src/config.ts` um E-Mail-/Storage-/Cloud-Variablen erweitert
  (Zod-Boot-Validierung).
- Neue schlanke Web-Validierung `apps/web/lib/env.ts` (`webEnv`), von `api.ts`
  und `site.ts` genutzt (kein direkter `process.env`-Zugriff mehr).
- Konsolidierte `.env.example`: Wurzel als Single Source, `apps/api` als Subset,
  klare `TODO PROVIDER SETUP`-Markierungen.

### Dokumentation
- `infrastructure.md` (Zielbild + Datenfluss-Diagramm), `deployment.md`
  (Dev/Staging/Prod, Build/Run, Migrations-/Rollback-Strategie),
  `storage-strategy.md`, `link-and-domain-strategy.md`, `env-and-secrets.md`,
  `decisions/adr-005-hosting-and-providers.md`, dieses Summary.
- README + roadmap aktualisiert.

## 2. Infra-/Provider-Entscheidungen

- **Supabase** = Managed Postgres (nur `DATABASE_URL`, Prisma-kompatibel).
- **Cloudflare** = DNS/CDN/TLS + Custom-Domains (White-Label), optional R2.
- **Resend** = E-Mail-Versand hinter der Notification-Abstraktion.
- **Storage** hinter Treiber-Interface (Supabase Storage **oder** R2), Default
  `local`. Provider-Auswahl per ENV; sicherer Fallback statt Crash.
- Hosting Web/API: zustandslose Runtimes/Container — konkrete Plattform offen.

## 3. Was Mock/Placeholder blieb

- Cloud-Storage-Treiber sind Platzhalter (`UnconfiguredCloudDriver`) —
  fehlschlagend bis zur echten Client-Implementierung. `TODO PROVIDER SETUP`.
- Kein echter E-Mail-Versand ohne `RESEND_API_KEY`.
- Keine Upload-Endpoints/UI (Attachments-UI = Block 8).
- Keine echten Deployments/CI, keine Custom-Domain-Automatik.
- Auth weiterhin Dev-Stub; Idempotency In-Memory.

## 4. Später nötige Credentials/Accounts

- **Resend:** API-Key + verifizierte Absenderdomain.
- **Supabase:** Projekt(e) Staging/Prod + Connection-String (+ Storage-Bucket,
  falls Supabase Storage).
- **Cloudflare:** Zone, Domains/Subdomains, TLS, ggf. R2-Bucket + Keys.
- **AUTH_JWT_SECRET** (Prod) für die echte Auth in Block 7.
- Konkrete **Hosting-Plattform** für Web/API. `TODO INFRA DECISION`.

## 5. Risiken

- Cloud-Treiber sind bewusst unimplementiert → echte Anbindung braucht
  zusätzliche Arbeit + Tests (nicht nur ENV setzen).
- `SUPABASE_SERVICE_ROLE_KEY`/`R2_*` sind hochsensibel → nur serverseitig, nie im
  Web-Bundle; Secrets-Handling pro Umgebung diszipliniert halten.
- Dev-Stub-Auth und In-Memory-Idempotency dürfen nicht in Produktion.
- Migrations-Disziplin (expand/contract) nötig für gefahrlose Rollbacks.

## 6. Nächster Block

**Block 7 — Auth- & Integrations-Härtung:** echte Auth (JWT-Sessions +
API-Keys/Scopes), Rate-Limiting, persistente Idempotency und echte ausgehende
Webhook-Zustellung (HMAC/Retry) — aufbauend auf dieser Infrastruktur, weiterhin
so weit wie möglich ohne externe Live-Accounts. Vollständiger Prompt im Handoff.
