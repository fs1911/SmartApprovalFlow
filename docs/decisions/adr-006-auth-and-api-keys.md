# ADR-006: Authentication & API Keys

- **Status:** akzeptiert (Block 7)
- **Datum:** 2026-07

## Kontext

Bis Block 6 lief die Autorisierung über einen Dev-Header-Stub. Für den echten
Betrieb brauchen wir echte Nutzer-Authentifizierung, maschinelle Integrationen
(API-Keys) und robuste Schutzmechanismen — ohne die bestehende, tenant-scoped
Permission-Matrix (adr-004) umzuwerfen und ohne native Krypto-Abhängigkeiten.

## Entscheidung

- **Nutzer-Auth: Session-JWT (HS256, `jose`).** Login mit E-Mail+Passwort →
  kurzlebiges Access-Token (Default 12h), signiert mit `AUTH_JWT_SECRET`. Das
  Token trägt nur `sub` (userId) + `tenantId`; **die Rolle wird bei jedem
  Request aus der Membership neu aufgelöst** (nie aus dem Token vertraut).
- **Passwort-Hashing: scrypt (Node built-in).** Kein natives Build (argon2/
  bcrypt vermieden); scrypt ist memory-hard und ausreichend. Format
  `scrypt$<salt>$<hash>`, Verifikation timing-safe. argon2id bleibt Option.
- **Integrationen: API-Keys mit Scopes.** Format `saf_<env>_<prefix>_<secret>`;
  gespeichert wird nur der SHA-256-Hash + der nicht-geheime Prefix. Der
  Klartext-Key wird **genau einmal** bei Erstellung zurückgegeben. Scopes sind
  eine Teilmenge der Permission-Matrix und laufen durch **denselben**
  `requirePermission`-Pfad wie Nutzer.
- **Einheitlicher Auth-Kontext:** Auflösung in der Reihenfolge (1) Bearer JWT,
  (2) Bearer API-Key (`saf_`-Prefix), (3) Dev-Header — Letzteres **nur** wenn
  `NODE_ENV !== 'production'`. Alle liefern eine konkrete `permissions`-Liste.
- **Rate-Limiting** (`@fastify/rate-limit`): globales Default pro IP, strenger
  für `/public/**` und `/auth/login`. 429 → `RATE_LIMITED` im Standard-Envelope.
- **Persistente Idempotency** (Postgres, keyed `(tenantId, key)`): ersetzt den
  In-Memory-Store; Replay + Reuse-Konflikt bleiben, jetzt neustart-/scale-fest.

## Alternativen

- **Sessions serverseitig (DB/Cookie-Store):** einfacher zu widerrufen, aber
  mehr State; kurzlebige JWTs genügen im MVP (Revocation via kurze TTL + später
  Deny-List).
- **argon2/bcrypt:** stärker/verbreiteter, aber native Builds → Umgebungsrisiko.
- **OAuth/SSO:** überdimensioniert für den aktuellen Reifegrad; später möglich.

## Konsequenzen

- Echte Auth ohne externe Live-Accounts, vollständig lokal testbar.
- Ein RBAC-Pfad für Nutzer **und** Integrationen (Permission-Matrix unverändert).
- Dev-Stub bleibt als lokaler Komfort, ist aber in Produktion deaktiviert.
- Offen/Deferred: Refresh-Token-Rotation, JWT-Revocation-Liste, Passwort-Reset,
  Login-Throttling pro Konto (heute pro IP). Siehe `security.md`.
