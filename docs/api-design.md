# API Design

Die Public API ist die **Source of Truth** für alle Clients (eigene Web-App und
spätere Integrationen). Interaktive Doku unter `GET /docs` (Swagger UI); der
Vertrag wird als `apps/api/openapi.json` exportiert.

## REST-Prinzipien

- Ressourcen als **Nomen**, keine Verben in URLs
  (`/approval-cases`, nicht `/createApprovalCase`).
- HTTP-Verben tragen die Semantik: `GET` (lesen), `POST` (erstellen/aktion).
- Sinnvolle Statuscodes: `200`, `201`, `401`, `403`, `404`, `409`, `410`,
  `422`, `429`, `500`.
- Konsistente JSON-Hüllen für Erfolg und Fehler (siehe unten).

## Versionierung

Pfad-basiert: **`/api/v1/...`**. Breaking Changes → neue Major-Version
(`/api/v2`). Additive Änderungen bleiben in `v1`. Begründung:
`decisions/adr-002-rest-api-strategy.md`.

## Auth-Ansatz

Zwei Wege, ein Kontext `{ tenantId, userId?, role, scopes }`:

- **Web-App-Nutzer** → kurzlebiges **JWT** (Bearer). *(Block 5)*
- **Integrationen** → **API-Keys** `Authorization: Bearer saf_live_...` mit
  Scopes. *(Block 5)*
- **Kundenseite** → **loginlos**, autorisiert durch Token-Besitz; Endpoints
  unter `/api/v1/public/**` verlangen keine Auth.

> **Block-2-Stand:** Auth ist als Dev-Stub implementiert (Header `x-saf-tenant`,
> `x-saf-role`), damit der Flow end-to-end läuft. Nur `plugins/auth-context.ts`
> wird in Block 5 ausgetauscht; die Endpoints bleiben unverändert.

## Rollen / Scopes

| Rolle | Kurz |
| --- | --- |
| `OWNER` | Alles inkl. Workspace/Team/API-Keys |
| `ADMIN` | Wie Owner ohne Abrechnung |
| `SERVICE_ADVISOR` | Fälle erstellen/senden/ansehen |
| `TECHNICIAN` | Eingeschränkt (Zuarbeit; Voice später) |

Scopes für API-Keys (Beispiele): `approval-cases:read`, `approval-cases:write`.

## Fehlerformat

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Eingabe ungültig",
    "details": [{ "path": "customer.email", "message": "..." }],
    "requestId": "..."
  }
}
```

Stabile `code`-Werte (Auszug): `VALIDATION_ERROR`, `UNAUTHENTICATED`,
`FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `IDEMPOTENCY_KEY_REUSED`, `TOKEN_INVALID`,
`TOKEN_EXPIRED`, `CASE_NOT_ACTIONABLE`, `RATE_LIMITED`, `INTERNAL_ERROR`.
Jede Antwort trägt `X-Request-Id` (Korrelation für Support).

## Erfolgsformat

```json
{ "data": { ... }, "meta": { "nextCursor": "...", "limit": 20 } }
```

`data` immer vorhanden; `meta` nur bei Listen (Pagination).

## Idempotency-Konzept

Unsafe Writes akzeptieren den Header **`Idempotency-Key`** (UUID). Die erste
Antwort wird gespeichert und bei Retry mit gleichem Payload **wiedergegeben**;
gleicher Key mit anderem Payload → `409 IDEMPOTENCY_KEY_REUSED`. Wichtig für
„Fall erstellen" und den **Kundenentscheid** (Doppel-Tap auf dem Handy).

> Block-2-Stand: In-Memory-Store (`lib/idempotency.ts`). Block 5: persistent in
> Postgres/Redis, keyed nach `(tenantId, key)`.

## Pagination-Konzept

**Cursor-basiert** (nicht Offset): `?limit=20&cursor=<opaque>`. Der Cursor kodiert
`(createdAt, id)` → stabile Ergebnisse auch bei neuen Zeilen. `meta.nextCursor`
ist `null` am Ende.

## Endpoints (Block 2)

| Methode | Pfad | Auth | Zweck |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | — | Liveness/Readiness |
| `GET` | `/api/v1/me` | ja | Aktueller Principal + Tenant |
| `GET` | `/api/v1/tenants/:tenantId` | ja | Workspace lesen (isolationsgeprüft) |
| `GET` | `/api/v1/approval-cases` | ja | Fälle listen (Cursor-Pagination) |
| `POST` | `/api/v1/approval-cases` | ja | Fall erstellen (validiert, idempotent) |
| `GET` | `/api/v1/approval-cases/:id` | ja | Fall-Detail inkl. Items/Audit |
| `POST` | `/api/v1/approval-cases/:id/generate-public-link` | ja | Kundenlink erzeugen/rotieren |
| `GET` | `/api/v1/public/approvals/:token` | — | Freigabeanfrage lesen (loginlos) |
| `POST` | `/api/v1/public/approvals/:token/respond` | — | Kundenentscheid (idempotent) |

## Webhook-Strategie (für später, Block 5)

Ausgehende Webhooks pro Tenant für Events wie `approval.approved`,
`approval.declined`, `approval.callback_requested`. Signiert (HMAC), mit Retry
und Idempotency auf Empfängerseite. Das `AuditEvent`- und `OutboundMessage`-Modell
ist bereits ein natürlicher Ausgangspunkt dafür.

## OpenAPI-Strategie

Die laufende App ist die Quelle: Schemas werden am Code deklariert, `GET /docs`
rendert sie, `npm run openapi:export --workspace apps/api` schreibt
`openapi.json` für Reviews und Integrationspartner.
