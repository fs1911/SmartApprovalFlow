# Block 11 — Summary (Billing & Plan-Enforcement)

Baut auf Block 1–10 auf, ohne Kernflows umzubauen. Ziel: das Produkt ist
monetarisierbar — Pläne, Limits, Nutzungszählung, Enforcement und ein
Zahlungsanbieter-Adapter. Lokal komplett ohne externe Accounts.

## 1. Was gebaut wurde

### Pläne & Limits
- Geteilte Definition in `packages/types/plans.ts` (Free/Starter/Pro, `null` =
  unbegrenzt) — API und Web nutzen dieselben Zahlen. Ein `Subscription`-Modell
  pro Tenant (Default Pro, damit Demo/Tests nie blockiert werden).

### Nutzungszählung & Enforcement
- Reine Funktionen `monthPeriod` + `evaluateLimit` (unit-getestet): Freigaben/
  Monat (Fälle mit `sentAt` im Kalendermonat) und Sitze (Mitglieder + offene
  Einladungen); weiche Schwelle bei 80 %.
- Zentrale Guards `assertWithinCaseLimit`/`assertWithinSeatLimit` → typisierter
  **402 `PLAN_LIMIT_REACHED`**. Eingehängt beim ersten Fall-Versand
  (`generate-public-link`/`send`) und bei der Einladung.

### BillingProvider-Adapter
- `lib/billing.ts` — Muster wie Storage/Notification/Monitoring: `mock` (Default,
  sofortige Wechsel) + `stripe`-Platzhalter (nur mit Key, sonst Fallback,
  `TODO PROVIDER SETUP`). `resolveBillingProviderName` mit sicherem Fallback.
- Endpoints: `GET /billing`, `POST /billing/change-plan` (mock: sofort; real:
  `checkoutUrl`), `POST /billing/webhook` (HMAC-signaturgeprüft, **idempotent**
  via `IdempotencyRecord`, verarbeitet `subscription.updated`). Jeder Wechsel
  schreibt `PLAN_CHANGED`.

### Web
- Einstellungen → „Plan & Nutzung": aktueller Plan, Nutzungsbalken (Warn-/
  Blockier-Farbe), Limit-Banner (weich/hart), Plan-Karten mit Wechsel-Buttons
  (mock sofort wirksam). `role="progressbar"`/`role="alert"`.

### Tests
- Unit: `evaluateLimit` (unter/soft/über/unbegrenzt), `monthPeriod`,
  Provider-Resolver, Webhook-Signatur (Round-Trip + Tampering).
- Integration (inject): `GET /billing`; `change-plan` wirkt + RBAC (VIEWER 403);
  Webhook mit falscher/gültiger Signatur + idempotenter Replay. 61 API-Tests grün.

## 2. Entscheidungen

- **Limits geteilt in @saf/types** — ein Wahrheitsort für API-Enforcement und
  Web-Anzeige.
- **Default-Plan Pro** für den Demo-Tenant — Limits sind opt-in ausprobierbar,
  ohne bestehende Flows/Tests zu blockieren.
- **Mock-Provider wendet sofort an**, realer Provider über Webhook — beides
  derselbe `applyPlan`-Pfad + Audit.
- **Enforcement nur beim erstmaligen Versand** — Link-Rotation zählt nicht doppelt.
- **Kalendermonat-Perioden (UTC)** — einfache, nachvollziehbare Zählung.

## 3. Was Mock/Placeholder blieb

- Keine echten Zahlungen; Stripe-Checkout/Portal + realer Webhook-Ingest sind
  über den Adapter vorbereitet (`TODO PROVIDER SETUP`).
- Perioden sind Kalendermonate, nicht an ein Abo-Anker-Datum gebunden.
- Kein Proration/Downgrade-Feinschliff, keine Rechnungen/Belege.

## 4. Später nötige Credentials/Accounts

- Stripe: `STRIPE_SECRET_KEY` (+ echtes Webhook-Secret) — dann `BILLING_PROVIDER=stripe`.

## 5. Risiken

- Wechsel auf einen niedrigeren Plan kann Limits sofort „überschritten" zeigen
  (Nutzung > neues Limit) — bewusst; Enforcement blockt nur neue Aktionen, nichts
  Bestehendes.
- Mock-Wechsel sind ohne Zahlung sofort wirksam — nur für Dev/Test gedacht.
- `Subscription`-Backfill passiert lazy; ein globaler Backfill-Job wäre sauberer.

## 6. Nächster Block

**Block 12 — Integrations- & API-Ökosystem:** öffentliche API-Doku/Developer-
Experience, Self-Service-Webhook-Verwaltung (Endpoints anlegen/testen/Secrets
rotieren), eingehende Integration (Fall-Erstellung per API-Key) und
Beispiel-Rezepte — weiterhin so weit wie möglich ohne externe Live-Accounts.
Prompt im Handoff.
