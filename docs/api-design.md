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

## Auth-Ansatz (Block 7: echt)

Ein einheitlicher Kontext `{ tenantId, userId?, role?, permissions[] }`,
aufgelöst in dieser Reihenfolge:

1. **Session-JWT** — `Authorization: Bearer <jwt>` (HS256, kurzlebig). Login über
   `POST /auth/login` (E-Mail+Passwort, scrypt-gehasht). Die Rolle wird pro
   Request aus der Membership neu aufgelöst.
2. **API-Key** — `Authorization: Bearer saf_live_...`; nur Hash+Prefix
   gespeichert, Klartext einmalig bei Erstellung. Scopes ⊆ Permission-Matrix.
3. **Dev-Header** — `x-saf-tenant` / `x-saf-role`, **nur** wenn
   `NODE_ENV !== 'production'` (lokaler Komfort inkl. Rollenumschalter).

**Kundenseite** bleibt loginlos (`/api/v1/public/**`, Token-Besitz).
Durchsetzung über `requirePermission(...)` — identisch für Nutzer und API-Keys.
Details: `decisions/adr-006-auth-and-api-keys.md`, `security.md`.

## Rate-Limiting (Block 7)

`@fastify/rate-limit`: globales Default pro IP (`RATE_LIMIT_MAX` /
`RATE_LIMIT_WINDOW`), strenger für `/public/**` (`RATE_LIMIT_PUBLIC_MAX`) und
`/auth/login` (`RATE_LIMIT_LOGIN_MAX`). Überschreitung → `429` mit Code
`RATE_LIMITED` im Standard-Envelope.

## Rollen & Berechtigungen (tenant-scoped RBAC, Block 4)

Kontrolliertes Rollenset (keine Custom Roles), **tenant-spezifisch** über
`Membership`. Die Permission-Matrix lebt in `@saf/types` (`ROLE_PERMISSIONS`) und
wird von API (Durchsetzung via `requirePermission`) und Web (Gating) geteilt.
Hinweis: `SERVICE_ADVISOR` ist der Produktbegriff „Advisor" (Enum-Wert aus
Kompatibilitätsgründen beibehalten). Details: `decisions/adr-004-...`.

| Permission | OWNER | ADMIN | ADVISOR | TECHNICIAN | VIEWER |
| --- | :-: | :-: | :-: | :-: | :-: |
| `cases:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `cases:create` | ✓ | ✓ | ✓ | | |
| `cases:send` | ✓ | ✓ | ✓ | | |
| `cases:annotate` | ✓ | ✓ | ✓ | ✓ | |
| `templates:read` | ✓ | ✓ | ✓ | | ✓ |
| `templates:write` | ✓ | ✓ | | | |
| `members:read` | ✓ | ✓ | ✓ | | ✓ |
| `members:manage` | ✓ | ✓ | | | |
| `workspace:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `workspace:manage` | ✓ | ✓ | | | |
| `reporting:read` | ✓ | ✓ | ✓ | | ✓ |

Owner-Guardrails (Business-Regeln, nicht als Permission): nur `OWNER` darf die
Rolle `OWNER` vergeben; der letzte Owner kann nicht herabgestuft werden.

**Membership-aware:** Der Auth-Kontext leitet die Rolle aus der Mitgliedschaft im
aktuellen Tenant ab; ohne Mitgliedschaft → `403`. Alle Ressourcen-Lookups sind
`{ id, tenantId }` → Cross-Tenant-Zugriff ergibt `404`. Scopes für API-Keys
(Block 5) spiegeln dieselben Permissions.

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

> **Block-7-Stand:** persistent in Postgres (`IdempotencyRecord`, keyed nach
> `(tenantId, key)`), neustart-/scale-fest.

## Pagination-Konzept

**Cursor-basiert** (nicht Offset): `?limit=20&cursor=<opaque>`. Der Cursor kodiert
`(createdAt, id)` → stabile Ergebnisse auch bei neuen Zeilen. `meta.nextCursor`
ist `null` am Ende.

## Endpoints

| Methode | Pfad | Auth | Zweck | Block |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health` | — | Liveness (Prozess up) | 1 |
| `GET` | `/api/v1/health/ready` | — | Readiness (Prozess + DB, sonst 503) | 9 |
| `POST` | `/api/v1/maintenance/cleanup` | `members:manage` | Retention-Cleanup (Idempotency/Webhooks/Attachments) | 9 |
| `POST` | `/api/v1/auth/login` | — | Login → Session-JWT (rate-limited) | 7 |
| `POST` | `/api/v1/auth/logout` | — | Logout (stateless) | 7 |
| `GET` | `/api/v1/auth/session` | ja | Aktuelle Sitzung | 7 |
| `POST` | `/api/v1/auth/forgot-password` | — | Reset anfordern (uniform, rate-limited) | 10 |
| `POST` | `/api/v1/auth/reset-password` | — | Passwort per Token setzen | 10 |
| `GET` | `/api/v1/me` | ja | Aktueller Principal + Tenant | 2 |
| `GET` | `/api/v1/tenants/:tenantId` | ja | Workspace lesen (isolationsgeprüft) | 2 |
| `GET` | `/api/v1/approval-cases` | ja | Fälle listen (Cursor-Pagination) | 2 |
| `POST` | `/api/v1/approval-cases` | ja | Fall erstellen (validiert, idempotent) | 2 |
| `GET` | `/api/v1/approval-cases/:id` | ja | Fall-Detail inkl. Items/Audit | 2 |
| `POST` | `/api/v1/approval-cases/:id/generate-public-link` | ja | Kundenlink erzeugen/rotieren | 2 |
| `POST` | `/api/v1/approval-cases/:id/send` | ja | Anfrage versenden (Link + E-Mail) | 3 |
| `POST` | `/api/v1/approval-cases/:id/remind` | ja | Erinnerung senden (nur offen) | 3 |
| `GET` | `/api/v1/approval-cases/:id/timeline` | ja | Verlauf (Audit + Messages) | 3 |
| `POST` | `/api/v1/approval-cases/:id/attachments` | `cases:annotate` | Foto registrieren → signierte Upload-URL | 8 |
| `GET` | `/api/v1/approval-cases/:id/attachments` | `cases:read` | Fotos listen (mit Download-URLs) | 8 |
| `DELETE` | `/api/v1/approval-cases/:id/attachments/:attachmentId` | `cases:annotate` | Foto entfernen | 8 |
| `PUT` | `/api/v1/uploads/local/*` | — (Capability-Key) | Lokaler Byte-Empfang (nur `local`-Treiber) | 8 |
| `GET` | `/api/v1/uploads/local/*` | — (Capability-Key) | Lokale Datei ausliefern | 8 |
| `POST` | `/api/v1/reminders/run` | `members:manage` | Reminder-Policy auswerten & senden | 8 |
| `GET` | `/api/v1/templates` | ja | Nachrichtenvorlagen listen | 3 |
| `GET` | `/api/v1/templates/:id` | ja | Vorlage lesen | 3 |
| `PATCH` | `/api/v1/templates/:id` | ja | Vorlage bearbeiten (subject/body) | 3 |
| `GET` | `/api/v1/members` | `members:read` | Mitglieder + Rollen listen | 4 |
| `PATCH` | `/api/v1/members/:id` | `members:manage` | Rolle zuweisen (Guardrails) | 4 |
| `POST` | `/api/v1/invitations` | `members:manage` | Mitglied einladen (E-Mail-Link) | 10 |
| `GET` | `/api/v1/invitations` | `members:read` | Offene Einladungen listen | 10 |
| `DELETE` | `/api/v1/invitations/:id` | `members:manage` | Einladung widerrufen | 10 |
| `POST` | `/api/v1/invitations/accept` | — | Einladung annehmen + Passwort setzen | 10 |
| `GET` | `/api/v1/onboarding` | `workspace:read` | Onboarding-Checkliste + Aktivierung | 10 |
| `POST` | `/api/v1/onboarding/sample-case` | `cases:create` | Beispiel-Fall anlegen | 10 |
| `GET` | `/api/v1/workspace` | `workspace:read` | Workspace/Branding lesen | 4 |
| `PATCH` | `/api/v1/workspace` | `workspace:manage` | Workspace/Branding ändern | 4 |
| `GET` | `/api/v1/reporting/summary` | `reporting:read` | Operative Kennzahlen | 4 |
| `GET` | `/api/v1/api-keys` | `members:manage` | API-Keys listen | 7 |
| `POST` | `/api/v1/api-keys` | `members:manage` | API-Key erstellen (Klartext einmalig) | 7 |
| `DELETE` | `/api/v1/api-keys/:id` | `members:manage` | API-Key widerrufen | 7 |
| `POST` | `/api/v1/webhooks/deliver` | `members:manage` | Ausstehende Webhooks zustellen | 7 |
| `GET` | `/api/v1/public/approvals/:token` | — | Freigabeanfrage lesen (loginlos) | 2 |
| `POST` | `/api/v1/public/approvals/:token/respond` | — | Kundenentscheid, ganzer Fall (idempotent) | 2 |
| `POST` | `/api/v1/public/approvals/:token/respond-items` | — | Kundenentscheid pro Position (aggregiert) | 8 |

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
`.viewed`, `.responded`, `.approved`, `.partially_approved`, `.declined`,
`.callback_requested`, `.expired`. Der Publisher (`lib/events.ts`) fächert sie an aktive
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
