# Integrations-Guide (Block 12)

Anbindung von Garagensoftware an Nicka: Fälle per API erstellen,
Events per Webhook empfangen. Lokal komplett ohne externe Accounts testbar.

Basis-URL (lokal): `http://localhost:4000`. Interaktive Doku: `/docs` (Swagger).

## Authentifizierung (API-Key)

Integrationen nutzen **API-Keys** mit Scopes (Teilmenge der Permission-Matrix).
Owner/Admin erstellen sie unter Einstellungen → Entwickler oder per API
(`POST /api/v1/api-keys`, Scopes z. B. `cases:read cases:create`). Der Klartext
wird **einmalig** zurückgegeben.

```bash
KEY="saf_live_xxx…"        # einmalig bei Erstellung angezeigt
# Verifizieren, welche Rechte der Key hat:
curl -s http://localhost:4000/api/v1/integration/whoami \
  -H "Authorization: Bearer $KEY"
# → { via: "api_key", permissions: ["cases:read","cases:create"], tenant: {…} }
```

## Rezept: Freigabefall erstellen (und senden)

```bash
curl -s -X POST http://localhost:4000/api/v1/approval-cases \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-4711" \
  -d '{
    "subject": "Bremsbeläge vorne ersetzen",
    "customer": { "name": "Anna Muster", "email": "anna@example.com" },
    "vehicle":  { "make": "VW", "model": "Golf", "plate": "ZH123456" },
    "items": [
      { "title": "Bremsbeläge vorne", "category": "SAFETY",
        "priceBand": { "minMinor": 18000, "maxMinor": 24000, "currency": "CHF" } }
    ]
  }'
```

- **Idempotency-Key** (optional, empfohlen): derselbe Key spielt bei Retries die
  gleiche Antwort zurück; ein anderer Body mit gleichem Key → `409`.
- Danach den Kundenlink erzeugen/senden (Rolle/Scope `cases:send`):
  `POST /api/v1/approval-cases/:id/generate-public-link`.
- Fehlt dem Key ein Scope, kommt ein sauberes `403 FORBIDDEN`. Plan-Limits
  (Block 11) greifen wie im UI (`402 PLAN_LIMIT_REACHED`).

## Rezept: Webhooks empfangen & verifizieren

Endpoint anlegen (Owner/Admin), Event-Allowlist optional (leer = alle):

```bash
curl -s -X POST http://localhost:4000/api/v1/webhook-endpoints \
  -H "Authorization: Bearer $USER_JWT" -H "Content-Type: application/json" \
  -d '{ "url": "https://ihre-software.example/webhooks/saf",
        "events": ["approval_case.approved","approval_case.declined"] }'
# → { id, secret: "whsec_…" }   ← Secret EINMALIG, sicher speichern
```

Zustellung ist **HMAC-SHA256-signiert**. Header:

- `X-SAF-Signature: sha256=<hex>` = HMAC-SHA256(secret, rawBody)
- `X-SAF-Event: approval_case.approved`
- `X-SAF-Delivery: <delivery-id>`

Verifikation auf Empfängerseite (Node):

```js
import { createHmac, timingSafeEqual } from 'node:crypto';
function verify(secret, rawBody, header) {
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(header ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Verwalten (alles unter Einstellungen → Entwickler oder per API):
`PATCH …/:id` (URL/Events/aktiv), `POST …/:id/rotate-secret`,
`POST …/:id/test` (signierte Testzustellung), `GET …/:id/deliveries`
(Status/Versuche, Cursor-Pagination), `DELETE …/:id`.

Lokal testen ohne echten Empfänger: Endpoint-URL auf den Dev-Sink
`http://localhost:4000/api/v1/dev/webhook-sink` setzen und „Test senden".

## Zustellung & Retry

Signierte Auslieferung mit Retry/Backoff (aus Block 7): fehlgeschlagene
Zustellungen werden mit exponentiellem Backoff (Cap 30 min) bis
`WEBHOOK_MAX_ATTEMPTS` erneut versucht. On-demand-Verarbeitung via
`POST /api/v1/webhooks/deliver` (oder ein externer Scheduler).

## Fehlerformat

Einheitlicher Envelope mit `error.code` (z. B. `FORBIDDEN`, `VALIDATION_ERROR`,
`IDEMPOTENCY_KEY_REUSED`, `PLAN_LIMIT_REACHED`, `RATE_LIMITED`) und
`X-Request-Id` zur Korrelation. Details: `docs/api-design.md`.

## Deferred

- Webhook-Signatur-Secrets werden serverseitig gespeichert (nötig zum Signieren);
  produktiv sollte Verschlüsselung at-rest ergänzt werden (`TODO`).
- Keine eingehenden Webhooks/Provider-Callbacks ausser dem Billing-Webhook.
