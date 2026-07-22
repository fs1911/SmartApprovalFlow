# Block 7 — Summary (Auth- & Integrations-Härtung)

Baut auf Block 1–6 auf, ohne Kernflows umzubauen. Ziel: echter Betrieb — echte
Auth, API-Keys, Rate-Limiting, persistente Idempotency und echte Webhook-
Zustellung. Alles lokal ohne externe Live-Accounts testbar.

## 1. Was gebaut wurde

### Nutzer-Authentifizierung
- **Login/Logout/Session** (`/auth/login`, `/auth/logout`, `/auth/session`).
- **Passwort-Hashing mit scrypt** (Node built-in, kein natives Build) —
  `lib/password.ts`. Seed-User haben Dev-Passwörter (`password123`).
- **Session-JWT** (HS256 via `jose`, kurzlebig) — `lib/jwt.ts`. Rolle wird pro
  Request aus der Membership aufgelöst (nie aus dem Token vertraut).

### API-Keys & Scopes
- **`/api-keys`** CRUD (OWNER/ADMIN): erstellen (Klartext **einmalig**), listen
  (nur Hash+Prefix), widerrufen. Scopes ⊆ Permission-Matrix — `lib/api-keys.ts`.

### Einheitlicher Auth-Kontext
- `plugins/auth-context.ts`: Auflösung (1) JWT, (2) API-Key (`saf_`-Prefix),
  (3) Dev-Header **nur ausserhalb Produktion**. `requirePermission` prüft eine
  konkrete `permissions`-Liste — identisch für Nutzer und Integrationen.

### Rate-Limiting
- `@fastify/rate-limit`: global pro IP, strenger für `/public/**` und
  `/auth/login`. 429 → `RATE_LIMITED` im Standard-Envelope (Error-Handler
  gehärtet: 4xx inkl. 429 sauber gemappt).

### Persistente Idempotency
- Postgres-Store (`IdempotencyRecord`, keyed `(tenantId, key)`) statt In-Memory
  — Replay + Reuse-Konflikt bleiben, jetzt neustart-/scale-fest.

### Webhook-Zustellung
- `lib/webhooks.ts`: HMAC-SHA256-Signatur (`X-SAF-Signature`), Retry mit
  exponentiellem Backoff (Cap 30 min), Status/Versuche in `WebhookDelivery`
  (+`nextAttemptAt`). Auslösung via `POST /webhooks/deliver`.
- **Dev-Sink** `POST /dev/webhook-sink` (nur Dev) verifiziert Signaturen →
  vollständig lokal testbar.

### Web
- **Login-/Logout-Flow** (Session-JWT im httpOnly-Cookie `saf_session`); die
  App-Shell leitet ohne Sitzung auf `/login`. Der **Dev-Rollenumschalter** ist
  nur noch im Development sichtbar; permission-gated UI unverändert.

## 2. Auth-/Security-Entscheidungen

- **scrypt statt argon2/bcrypt** — zero native deps, sandbox-/umgebungssicher.
- **JWT statt Server-Sessions** — kurzlebig, zustandslos; Revocation via kurze
  TTL (Deny-List später).
- **API-Key-Scopes = Permission-Matrix** — ein RBAC-Pfad, kein Zweitsystem.
- **Dev-Header nur ausserhalb Produktion** — lokaler Komfort, in Prod deaktiviert.
- **Rate-Limit-Fehler** über den zentralen Error-Handler (konsistentes Envelope).

## 3. Was Mock/Placeholder blieb

- Kein Passwort-Reset, keine Refresh-Token-Rotation, keine JWT-Revocation-Liste.
- Login-Throttling pro **IP** (nicht pro Konto).
- Webhook-Zustellung wird **on demand** ausgelöst (kein Scheduler/Cron); der
  Dev-Sink ist ein Test-Empfänger, kein echter externer Dienst.
- E-Mail/Storage weiterhin console/local, sofern keine Provider-Credentials.
- Kein API-Keys-Verwaltungs-UI im Web (nur über die API); folgt bei Bedarf.

## 4. Später nötige Credentials/Accounts

- Produktives, sicheres `AUTH_JWT_SECRET` (Staging/Prod).
- Für realen E-Mail-/Storage-/Hosting-Betrieb: siehe Block 6 (`env-and-secrets`).
- Für echte Webhook-Empfänger: Partner-URLs + Secrets (pro `WebhookEndpoint`).

## 5. Risiken

- Kurze-TTL-JWTs ohne Revocation-Liste: ein kompromittiertes Token gilt bis
  Ablauf → TTL bewusst kurz halten, Deny-List nachrüsten.
- IP-basiertes Login-Limit umgehbar bei verteilten IPs → Konto-Throttling
  ergänzen.
- Dev-Header/Dev-Sink dürfen nie in Produktion aktiv sein (per NODE_ENV
  geschützt) — bei Fehlkonfiguration Risiko.
- Idempotency-/Webhook-Tabellen brauchen später Aufräum-Jobs (Expiry/Retention).

## 6. Nächster Block

**Block 8 — Portal-Ausbau & Delivery:** produktive Foto-Uploads über die in
Block 6 vorbereitete Storage-Abstraktion, mehrere Positionen mit optionaler
Einzelfreigabe, automatische Reminder-Policy und realer E-Mail/SMS-Versand —
weiterhin so weit wie möglich ohne externe Live-Accounts. Prompt im Handoff.
