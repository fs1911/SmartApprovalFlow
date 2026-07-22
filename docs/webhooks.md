# Webhooks

Ausgehende Webhooks für Integrationen. Grundlage in Block 3 (Event-Publisher +
`WebhookEndpoint`/`WebhookDelivery`), echte Zustellung in Block 7.

## Event-Contract

Domain-Events (stabil, dot-namespaced): `approval_case.created`, `.sent`,
`.reminder_sent`, `.viewed`, `.responded`, `.approved`, `.declined`,
`.callback_requested`, `.expired`.

Payload:

```json
{
  "type": "approval_case.approved",
  "approvalCaseId": "…",
  "data": { "reference": "AC-2026-0007" },
  "occurredAt": "2026-07-…Z"
}
```

## Zustellung

- Events werden als `WebhookDelivery` (Status QUEUED) an alle **aktiven**
  Endpoints des Tenants angelegt (Event-Allowlist pro Endpoint; leer = alle).
- Der Delivery-Worker (`deliverPending()`) sendet fällige Deliveries als
  HTTP `POST` und aktualisiert Status/Versuche.
- Auslösung: `POST /api/v1/webhooks/deliver` (Recht `members:manage`). Kein
  Cron-Zwang; ein Scheduler kann dieselbe Funktion periodisch aufrufen.

## Signatur

Jede Zustellung trägt Header:

| Header | Inhalt |
| --- | --- |
| `X-SAF-Signature` | `sha256=<hex>` = HMAC-SHA256(endpoint.secret, rawBody) |
| `X-SAF-Event` | Event-Typ |
| `X-SAF-Delivery` | Delivery-ID |

**Verifikation beim Empfänger:** HMAC-SHA256 über den exakten Body mit dem
geteilten Secret berechnen und konstantzeit-vergleichen. Referenz:
`verifySignature()` in `apps/api/src/lib/webhooks.ts`.

## Retry / Backoff

- Nicht-2xx oder Netzwerkfehler → Status bleibt QUEUED, `attempts++`,
  `nextAttemptAt = now + backoff(attempt)`.
- Backoff exponentiell (10s, 20s, 40s, …), gedeckelt bei 30 min.
- Nach `WEBHOOK_MAX_ATTEMPTS` (Default 5) → Status FAILED.

## Lokal testen (ohne externen Dienst)

Im Dev-Modus existiert ein Empfänger `POST /api/v1/dev/webhook-sink`, der die
Signatur prüft und loggt. Endpoint darauf zeigen lassen, ein Event auslösen
(z. B. Fall senden), dann `POST /api/v1/webhooks/deliver` — die Delivery geht auf
`SENT`, wenn die Signatur gültig ist.

## Eingehende Webhooks (Billing, später)

Für Zahlungsanbieter-Events (Block 6-Doku `billing-strategy.md`) wird ein
**eingehender** Webhook-Handler benötigt (Provider → uns), analog signiert. Nicht
Teil von Block 7.
