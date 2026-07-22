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

## Bewusst offen / Deferred (Backlog)

- **Refresh-Token-Rotation** und **JWT-Revocation-Liste** (heute: kurze TTL).
- **Passwort-Reset**-Flow und **Login-Throttling pro Konto** (heute pro IP).
- **CSRF:** aktuell Bearer-Token (kein Cookie-basiertes Auto-Send an die API);
  bei Cookie-Auth wäre CSRF-Schutz nötig.
- **Audit von Admin-Aktionen** (Rollenwechsel, Key-Erstellung) ausbauen.
- **Secrets-Rotation** und **RLS** (Postgres Row-Level-Security) als zweite
  Isolationslinie.
- **Security-Header/HSTS/CSP** am Edge (Cloudflare, Block 6-Zielbild).

Formale Zusicherungen (DPA, Zertifizierungen, Hosting-Standort) werden mit dem
produktiven Betrieb finalisiert — `TODO LEGAL REVIEW`.
