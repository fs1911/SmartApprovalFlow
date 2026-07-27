# Security

Kurzfassung des Bedrohungsmodells und der sicheren Defaults. Ergänzt die
öffentliche Seite `/security` (Kundenperspektive) um die technische Sicht.

## Sichere Defaults

- **Auth:** Session-JWT (kurzlebig) + API-Keys (nur Hash gespeichert). Dev-Header
  nur ausserhalb Produktion. Passwörter mit scrypt gehasht, timing-safe geprüft.
- **RBAC:** tenant-scoped Permission-Matrix; ein Enforcement-Pfad für Nutzer und
  API-Keys.
- **Tenant-Isolation:** jede Query filtert `tenantId` aus dem Auth-Kontext;
  Ressourcen-Lookups `{ id, tenantId }` → Cross-Tenant = 404.
- **Kundenlinks:** unguessbare Tokens, nur Hash gespeichert, Ablauf + Revoke,
  Datenminimierung (nur freigaberelevante Felder).
- **Rate-Limiting:** global pro IP, strenger für `/public/**` und `/auth/login`.
- **Idempotency:** persistent, verhindert Doppelverarbeitung bei Retries.
- **Webhooks:** HMAC-signiert; Empfänger verifizieren die Signatur.
- **Fehler-Envelope:** einheitlich; keine internen Details in Produktion;
  `X-Request-Id` zur Korrelation.
- **Log-Redaction (Block 9):** `authorization`/`cookie`-Header,
  `x-saf-sink-secret` und `idempotency-key` werden aus den Logs zensiert.
- **Retention (Block 9):** abgelaufene Idempotency-Records, alte Webhook-
  Zustellungen und verwaiste Attachments werden per `POST /maintenance/cleanup`
  aufgeräumt (tenant-scoped) — siehe `docs/retention-and-cleanup.md`. Der
  Audit-Trail bleibt unangetastet.
- **Error-Monitoring (Block 9):** unerwartete 5xx werden über einen Seam
  gemeldet (Default No-Op, real via `ERROR_MONITORING`+DSN) — `docs/observability.md`.
- **Billing-Webhooks (Block 11):** signaturgeprüft (HMAC-SHA256, Konstantzeit-
  Vergleich) und idempotent verarbeitet; Plan-Limits werden server-seitig
  durchgesetzt (`PLAN_LIMIT_REACHED`) — `docs/billing-and-plans.md`. Provider-
  Secrets (Stripe) sind `TODO PROVIDER SETUP` und werden nie committet.
- **Integrationen (Block 12):** API-Keys tragen Scopes (⊆ Permission-Matrix), ein
  Enforcement-Pfad; ausgehende Webhooks sind HMAC-signiert, Secrets werden nur bei
  Erstellung/Rotation angezeigt. Deferred: Verschlüsselung der Webhook-Secrets
  at-rest (heute Klartext gespeichert, da zum Signieren nötig) —
  `docs/integrations-guide.md`.
- **Datenlebenszyklus (Block 15):** DSGVO-Export/Löschung nur mit `data:manage`
  (OWNER/ADMIN); Löschung erfordert `?confirm=true`, kaskadiert und wird als
  `DATA_ERASED` auditiert; optionale Fall-Aufbewahrung (`RETENTION_CASE_MONTHS`)
  löscht nur terminale Fälle — `docs/data-lifecycle.md`.

## Bedrohungen & Massnahmen (Auszug)

| Bedrohung | Massnahme |
| --- | --- |
| Credential-Brute-Force | Login-Rate-Limit, uniforme Fehlermeldung |
| Token-Diebstahl (DB-Leak) | nur Hashes gespeichert (Passwörter, API-Keys, Link-Tokens) |
| Cross-Tenant-Zugriff | `tenantId`-Filter + `{id,tenantId}`-Lookups |
| Replays/Doppelklicks | persistente Idempotency |
| Webhook-Spoofing | HMAC-Signatur + Konstantzeit-Vergleich |
| Missbrauch der Public-Endpoints | strengeres Rate-Limit, kurze Token-Gültigkeit |
| Rechte-Eskalation via API-Key | Scopes ⊆ Permission-Matrix; Owner-Only-Regeln |

## Onboarding-Tokens (Block 10)

- **Einladungen** und **Passwort-Reset** nutzen gehashte, einmalige, ablaufende
  Tokens (`VerificationToken`, nur SHA-256 gespeichert) — siehe
  `docs/onboarding-and-invitations.md`.
- `forgot-password` antwortet **uniform** (immer `200`) → keine User-Enumeration;
  beide Endpoints sind login-rate-limited. Reset verbraucht den Token einmalig
  und widerruft übrige offene Reset-Tokens des Nutzers.

## Bewusst offen / Deferred (Backlog)

- **Refresh-Token-Rotation** und **JWT-Revocation-Liste** (heute: kurze TTL).
- **Login-Throttling pro Konto** (heute pro IP). Passwort-Reset ist ab Block 10
  vorhanden.
- **CSRF:** aktuell Bearer-Token (kein Cookie-basiertes Auto-Send an die API);
  bei Cookie-Auth wäre CSRF-Schutz nötig.
- **Audit von Admin-Aktionen** (Rollenwechsel, Key-Erstellung) ausbauen.
- **Secrets-Rotation** und **RLS** (Postgres Row-Level-Security) als zweite
  Isolationslinie.
- **Security-Header/HSTS/CSP** am Edge (Cloudflare, Block 6-Zielbild).

Formale Zusicherungen (DPA, Zertifizierungen, Hosting-Standort) werden mit dem
produktiven Betrieb finalisiert — `TODO LEGAL REVIEW`.
