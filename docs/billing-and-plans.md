# Billing & Pläne (Block 11)

Das Produkt ist monetarisierbar — mit Plänen, Limits, Nutzungszählung und einem
Zahlungsanbieter-Adapter. Lokal komplett ohne externe Accounts nutzbar: der
`mock`-Provider wendet Planwechsel sofort an, Limits greifen nachvollziehbar.

## Pläne & Limits

Geteilt in `packages/types/plans.ts` (API **und** Web nutzen dieselben Zahlen;
`null` = unbegrenzt):

| Plan | Freigaben/Monat | Sitze | Richtpreis |
| --- | --- | --- | --- |
| **Free** | 10 | 2 | CHF 0 |
| **Starter** | 100 | 5 | CHF 49/Mt. |
| **Pro** | unbegrenzt | unbegrenzt | CHF 149/Mt. |

Ein Tenant hat genau eine `Subscription` (Default **Pro**, damit Demo/Tests nie
durch Limits blockiert werden). Preise sind indikativ (Marketing/UI).

## Nutzungszählung

Reine, unit-getestete Funktionen (`monthPeriod`, `evaluateLimit`):

- **Freigaben/Monat**: Anzahl Fälle mit `sentAt` im aktuellen Kalendermonat (UTC).
- **Sitze**: aktive Mitglieder **plus** offene Einladungen.
- `evaluateLimit(used, limit)` liefert `{ withinLimit, softWarning, remaining }`.
  Bei ≥ 80 % des Limits (aber noch darunter) → weicher Hinweis; am/über dem
  Limit → Blockade.

## Enforcement

Zentrale Guards (`assertWithinCaseLimit`, `assertWithinSeatLimit`) werfen einen
typisierten **402 `PLAN_LIMIT_REACHED`**:

- **Fall senden** (erstmaliger Versand: `generate-public-link` bei `DRAFT`,
  `send` wenn `sentAt` leer) → gegen das Monats-Freigabelimit.
- **Mitglied einladen** → gegen das Sitzlimit (offene Einladung zählt als Sitz).

Wiederholtes Erzeugen eines Links für einen bereits gesendeten Fall zählt
**nicht** erneut. Weiche Schwellen blockieren nicht, sie erzeugen nur Hinweise.

## Endpoints

```
GET  /api/v1/billing               (workspace:read)   Plan + Nutzung + Pläne
POST /api/v1/billing/change-plan   (workspace:manage) Plan wechseln
POST /api/v1/billing/webhook       (signiert)         Provider-Event verarbeiten
```

- `change-plan`: **mock** wendet sofort an (`applied: true`); ein realer Provider
  liefert eine `checkoutUrl` und bestätigt später per Webhook.
- `webhook`: verifiziert die HMAC-SHA256-Signatur (`X-SAF-Billing-Signature`,
  Secret `BILLING_WEBHOOK_SECRET`), verarbeitet `subscription.updated`
  `{ id, tenantId, planKey }` **idempotent** (per `IdempotencyRecord`), lokal
  vollständig testbar. Jeder Wechsel schreibt ein `PLAN_CHANGED`-Audit-Event.

## Provider-Adapter

`lib/billing.ts` — gleiches Muster wie Storage/Notification/Monitoring:

- `mock` (Default): keine Credentials, sofortige Wechsel.
- `stripe` (Platzhalter): nur aktiv mit `STRIPE_SECRET_KEY`, sonst Fallback auf
  `mock` (mit Warnung). Checkout/Portal-Session sind `TODO PROVIDER SETUP`.

## Web

Einstellungen → **Plan & Nutzung**: aktueller Plan, Nutzungsbalken (mit
Warn-/Blockier-Farbe), Limit-Banner (weich/hart) und Plan-Karten mit
Upgrade-/Wechsel-Buttons (mock: sofort wirksam).

## Grenzen / Deferred

- Keine echten Zahlungen; Stripe-Checkout/Portal + Webhook-Ingest sind über den
  Adapter vorbereitet (`TODO PROVIDER SETUP`).
- Perioden sind Kalendermonate (UTC), nicht an ein Abo-Anker-Datum gebunden.
- `Subscription`-Backfill für Alt-Tenants passiert lazy beim ersten Zugriff.
- Retention/Cleanup könnte alte `IdempotencyRecord` der Billing-Webhooks
  einschliessen (bereits durch die Idempotency-Retention aus Block 9 abgedeckt).
