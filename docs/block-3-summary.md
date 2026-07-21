# Block 3 — Summary (Operational Hardening & Marktfähigkeit)

Baut auf Block 1 (Foundation) und Block 2 (Approval Workflow) auf — ohne die
Architektur oder Kernflows umzubauen. Ziel: den Approval-Flow operativ härten
und verkaufsfähiger machen (Versand, Vorlagen, Reminder, Statushärtung, bessere
Kundenseite, stärkere Timeline, Integrations-Readiness).

## 1. Was in Block 3 gebaut wurde

### Versand- & Notification-Logik
- **`POST /api/v1/approval-cases/:id/send`** — erzeugt einen frischen Link,
  rendert die Anfrage-Vorlage, versendet per E-Mail, setzt Status `SENT` und
  `sentAt`, schreibt Audit + OutboundMessage und emittiert `approval_case.sent`.
- **Notification-Abstraktion** (`lib/notifications.ts`): produktionsnahe
  `MessageProvider`-Schnittstelle mit **Console-/Dev-Provider** als Default
  (keine Credentials nötig). Realer Provider (SMTP/Resend/…) wird später nur
  angeschlossen — kein Route-Umbau. **SMS** ist als Kanal modelliert, aber
  bewusst deaktiviert (klarer „not enabled"-Rückgabewert).
- Jeder Versand erzeugt eine **`OutboundMessage`** (QUEUED → SENT/FAILED).

### Nachrichtenvorlagen
- Zwei Default-Templates geseedet: `approval_request_email`,
  `approval_reminder_email`.
- **`GET /templates`**, **`GET /templates/:id`**, **`PATCH /templates/:id`**.
- Schlanke `{{placeholder}}`-Engine (`lib/templates.ts`) — unbekannte Platzhalter
  werden leer, werfen nie. Variablen: `customerName`, `subject`, `vehicle`,
  `priceBand`, `link`, `expiresAt`, `workspaceName`, `workspaceContact`.
- **Einstellungen-Seite** in der Web-App zum Bearbeiten der Vorlagen.

### Reminder
- **`POST /api/v1/approval-cases/:id/remind`** — nur für offene Fälle
  (SENT/VIEWED/CALLBACK), nutzt das Reminder-Template, erhöht `reminderCount`,
  setzt `lastReminderAt`, schreibt Audit + emittiert `approval_case.reminder_sent`.
- **Reminder-Button** in der Fall-Detailansicht (manuell ausgelöst).

### Statushärtung
- **State-Machine** (`lib/status.ts`): erlaubte Übergänge zentral definiert,
  `assertTransition` verhindert ungültige Wechsel. `isPending`/`isTerminal`/
  `isExpired`-Helfer.
- **Lazy Expiry:** Beim Öffnen/Antworten eines abgelaufenen Links wird der Fall
  einmalig auf `EXPIRED` gesetzt, protokolliert und `approval_case.expired`
  emittiert — ohne Hintergrund-Job.
- Zeitstempel sauber geführt: `sentAt`, `openedAt`, `lastReminderAt`,
  `reminderCount`, `respondedAt`, `expiresAt`.

### Öffentliche Kundenseite
- Vertrauensbildende, kundennahe Sprache; erklärender Einleitungssatz.
- Deutlichere CTA-Hierarchie (Freigeben primär, Rückruf sekundär, Ablehnen
  nachrangig), Rückruf-Hinweis, Gültigkeits-/Ablaufhinweis.
- Freundlicher, hilfreicher Zustand bei ungültigem/abgelaufenem Link.
- Confirmation-States pro Entscheidung bleiben klar.

### Timeline / Audit
- **`GET /api/v1/approval-cases/:id/timeline`** — Audit-Events **und**
  OutboundMessages chronologisch zusammengeführt.
- Detailansicht zeigt Verlauf inkl. Versand/Reminder sowie Versanddetails
  (gesendet, geöffnet, Erinnerungen, beantwortet).
- Dashboard: „Wartet auf Kunde", „Heute beantwortet", „Freigegeben",
  „Abgelehnt".

### Integrations-Readiness (Events / Webhooks)
- Stabile **Domain-Events** (`DOMAIN_EVENT_TYPE`): `approval_case.created`,
  `.sent`, `.reminder_sent`, `.viewed`, `.responded`, `.approved`, `.declined`,
  `.callback_requested`, `.expired`.
- **`WebhookEndpoint`** (Registrierung, Event-Allowlist, aktiv/inaktiv) und
  **`WebhookDelivery`** (Zustellabsicht). `lib/events.ts` fächert Events an aktive
  Endpoints aus (Dev: Delivery-Zeile + Log). Fehler sind **non-fatal** für den
  Request.

## 2. Notification-/Template-Entscheidungen

- **Console-Provider als MVP-Default:** voller Send-Flow ohne Credentials
  testbar; realer Provider ist ein reines Anschluss-Thema. (`EMAIL_PROVIDER`)
- **Kein Template-Engine-Overkill:** bewusst nur `{{placeholder}}` mit
  Fallback-Defaults im Code, falls ein Tenant keine Vorlage hat.
- **Link-Rotation bei jedem Send/Reminder:** Da nur der Token-**Hash**
  gespeichert wird, kann kein Klartext-Link rekonstruiert werden. Jeder Versand
  erzeugt daher einen frischen Link; die **jeweils neueste** E-Mail enthält den
  gültigen Link. Bewusster, sicherer MVP-Kompromiss.

## 3. Bewusst einfach gehalten

- SMS nur als Struktur (kein Transport).
- Webhook-**Zustellung** noch ohne echten HTTP-Call/Signatur/Retry (nur
  Delivery-Zeile). Signing/Retry/Backoff = Block 5.
- Automatische Reminder-Policy nicht aktiviert — manuell ausgelöst (die Felder
  `lastReminderAt`/`reminderCount` bereiten eine spätere Policy sauber vor).
- Auth weiterhin Dev-Stub.
- Idempotency-Store weiterhin In-Memory.

## 4. Risiken / technische Schulden

- **Link-Rotation** invalidiert ältere Links — muss in der Nutzerkommunikation
  klar sein („neuesten Link verwenden"). Alternative (stabiler, verschlüsselt
  gespeicherter Token) ist eine Option für später.
- **Webhook-Zustellung** ist vorbereitet, aber nicht real — externe Systeme
  erhalten noch nichts, bis Block 5 den Delivery-Worker bringt.
- **Lazy Expiry** setzt `EXPIRED` erst beim nächsten Zugriff; ohne Zugriff bleibt
  der Status optisch offen (Datenmodell/`expiresAt` erlauben später einen Sweep).
- Dev-Stub-Auth und In-Memory-Idempotency dürfen nicht in Produktion.

## 5. Nächster Block

**Block 4/5 — Delivery & Auth-Härtung:**
1. Realer E-Mail-Provider (SMTP/Resend) + optional SMS.
2. Automatische Reminder-Policy (nach X Tagen, konfigurierbar).
3. Echte **Webhook-Zustellung** (HMAC-Signatur, Retry/Backoff) + Registrierungs-UI.
4. Echte Auth (JWT-Sessions + API-Keys/Scopes), Rate-Limiting, persistente
   Idempotency. Dabei wird nur `auth-context.ts` ausgetauscht.
