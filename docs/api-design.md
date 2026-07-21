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

## Endpoints

| Methode | Pfad | Auth | Zweck | Block |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health` | — | Liveness/Readiness | 1 |
| `GET` | `/api/v1/me` | ja | Aktueller Principal + Tenant | 2 |
| `GET` | `/api/v1/tenants/:tenantId` | ja | Workspace lesen (isolationsgeprüft) | 2 |
| `GET` | `/api/v1/approval-cases` | ja | Fälle listen (Cursor-Pagination) | 2 |
| `POST` | `/api/v1/approval-cases` | ja | Fall erstellen (validiert, idempotent) | 2 |
| `GET` | `/api/v1/approval-cases/:id` | ja | Fall-Detail inkl. Items/Audit | 2 |
| `POST` | `/api/v1/approval-cases/:id/generate-public-link` | ja | Kundenlink erzeugen/rotieren | 2 |
| `POST` | `/api/v1/approval-cases/:id/send` | ja | Anfrage versenden (Link + E-Mail) | 3 |
| `POST` | `/api/v1/approval-cases/:id/remind` | ja | Erinnerung senden (nur offen) | 3 |
| `GET` | `/api/v1/approval-cases/:id/timeline` | ja | Verlauf (Audit + Messages) | 3 |
| `GET` | `/api/v1/templates` | ja | Nachrichtenvorlagen listen | 3 |
| `GET` | `/api/v1/templates/:id` | ja | Vorlage lesen | 3 |
| `PATCH` | `/api/v1/templates/:id` | ja | Vorlage bearbeiten (subject/body) | 3 |
| `GET` | `/api/v1/public/approvals/:token` | — | Freigabeanfrage lesen (loginlos) | 2 |
| `POST` | `/api/v1/public/approvals/:token/respond` | — | Kundenentscheid (idempotent) | 2 |

## Notifications (Block 3)

Ausgehende Nachrichten laufen über eine Provider-Abstraktion. Der Default
`console` loggt E-Mails in die API-Ausgabe und braucht **keine Credentials** —
der komplette Send-/Reminder-Flow ist ohne Provider testbar. Ein realer Provider
(SMTP/Resend/…) implementiert `MessageProvider` und wird über `EMAIL_PROVIDER`
gewählt; Routen ändern sich nicht. Jeder Versand persistiert eine
`OutboundMessage` (QUEUED → SENT/FAILED). **SMS** ist als Kanal modelliert, aber
noch ohne Transport.

## Message Templates (Block 3)

Pro Tenant, `subject` + `body` mit `{{placeholder}}`-Variablen. Bewusst **kein**
Template-Engine-Overkill: unbekannte Platzhalter werden leer ersetzt (werfen
nie); fehlt eine Vorlage, greift ein Code-Default. Variablen: `customerName`,
`subject`, `vehicle`, `priceBand`, `link`, `expiresAt`, `workspaceName`,
`workspaceContact`. Typen: `approval_request_email`, `approval_reminder_email`.

## Statusmodell & Übergänge (Block 3)

Zentrale State-Machine (`lib/status.ts`). Erlaubte Übergänge:

| Von | Nach |
| --- | --- |
| `DRAFT` | `SENT`, `CANCELLED` |
| `SENT` | `VIEWED`, `APPROVED`, `DECLINED`, `CALLBACK`, `EXPIRED`, `CANCELLED` |
| `VIEWED` | `APPROVED`, `DECLINED`, `CALLBACK`, `EXPIRED`, `CANCELLED` |
| `CALLBACK` | `APPROVED`, `DECLINED`, `EXPIRED`, `CANCELLED` |
| `APPROVED`/`DECLINED`/`EXPIRED`/`CANCELLED` | — (terminal) |

Ungültige Übergänge → `409 CASE_NOT_ACTIONABLE`. **Expiry** ist „lazy": ein
abgelaufener Link setzt den Fall beim nächsten Zugriff einmalig auf `EXPIRED`.

## Events & Webhooks (Grundlage in Block 3, Zustellung in Block 5)

Nach jedem erfolgreichen Statuswechsel emittieren die Routen stabile
**Domain-Events**: `approval_case.created`, `.sent`, `.reminder_sent`,
`.viewed`, `.responded`, `.approved`, `.declined`, `.callback_requested`,
`.expired`. Der Publisher (`lib/events.ts`) fächert sie an aktive
`WebhookEndpoint`s des Tenants aus und legt je Ziel eine `WebhookDelivery`
(QUEUED) an; Fehler sind für den Haupt-Request **non-fatal**.

Payload-Form:

```json
{ "type": "approval_case.approved", "approvalCaseId": "…",
  "data": { "reference": "AC-2026-0007" }, "occurredAt": "…" }
```

Die eigentliche HTTP-Zustellung mit **HMAC-Signatur, Retry und Backoff** ist
Block 5 und berührt nur den Delivery-Worker, nicht die Aufrufstellen. Das
`AuditEvent` bleibt der interne Nachweis, die Domain-Events sind der externe
Vertrag.

## OpenAPI-Strategie

Die laufende App ist die Quelle: Schemas werden am Code deklariert, `GET /docs`
rendert sie, `npm run openapi:export --workspace apps/api` schreibt
`openapi.json` für Reviews und Integrationspartner.
