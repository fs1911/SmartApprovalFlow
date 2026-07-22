# Block 8 — Summary (Portal-Ausbau & Delivery)

Baut auf Block 1–7 auf, ohne Kernflows umzubauen. Ziel: den Kundennutzen
„Foto + Klartext + Preisband" vollständig machen — produktive Foto-Uploads,
mehrere Positionen mit optionaler Einzelfreigabe und eine automatische
Reminder-Policy. Alles lokal ohne externe Live-Accounts testbar.

## 1. Was gebaut wurde

### Foto-Uploads (End-to-End, lokal)
- **Zwei-Schritt-Upload** über die Storage-Abstraktion aus Block 6:
  `POST /approval-cases/:id/attachments` legt den Datensatz an und liefert eine
  signierte Upload-URL; der Client PUTet die Bytes an
  `PUT /uploads/local/*` (local-Treiber). `GET /uploads/local/*` liefert sie
  zurück. Content-Type (nur Bilder) und Grösse werden bei Registrierung **und**
  beim Byte-Empfang validiert.
- Attachments sind Tenant- und optional Positions-scoped; erst nach Byte-Empfang
  (`uploadedAt`) für den Kunden sichtbar. Anzeige intern (Detailseite, pro
  Position) und auf der Kundenseite (signierte Download-URLs).
- `GET/DELETE /approval-cases/:id/attachments`, RBAC über `cases:annotate`.

### Mehrere Positionen + optionale Einzelfreigabe
- Der Kunde kann pro Position freigeben/ablehnen:
  `POST /public/approvals/:token/respond-items`. Der Fallstatus wird
  **server-seitig aggregiert** (reine, getestete Funktion `aggregateItemDecisions`):
  alles ja → `APPROVED`, alles nein → `DECLINED`, gemischt → **`PARTIALLY_APPROVED`**,
  irgendein Rückruf → `CALLBACK` (nicht terminal).
- Neuer Status `PARTIALLY_APPROVED` in Enum, State-Machine und UI. Einzelentscheide
  spiegeln sich in `ApprovalItem.decision/decidedAt`, jede Position erzeugt einen
  `ApprovalDecision` (mit `approvalItemId`) und ein `CASE_ITEM_DECIDED`-Audit-Event.
- Der bestehende „ganzer Fall"-Entscheid (`/respond`) bleibt unverändert.

### Automatische Reminder-Policy
- Reine Policy-Funktion `decideReminder` (ENV-konfigurierbar: erste nach X,
  weitere nach Y, Obergrenze Z), Trigger-Endpoint `POST /reminders/run`
  (`members:manage`), kein Cron-Zwang. Details: `docs/reminders.md`.
- Teilt den Versand-Pfad mit der manuellen Erinnerung (`sendReminder`) →
  Audit, Zähler, `OutboundMessage`, Event `approval_case.reminder_sent`.

### Delivery
- Alle neuen Benachrichtigungen laufen durch die Notification-Abstraktion
  (console-Default, Resend real anschliessbar). SMS bleibt vorbereitet.

### Web
- Detailseite: Foto-Upload (Zwei-Schritt, mit optionaler Positionszuordnung),
  Galerie, Positions-Entscheid-Badges.
- Kundenseite: Fotos pro Position, „Alle freigeben" **oder** „Einzeln entscheiden"
  (pro Position ✓/✕), Erfolgszustand inkl. `PARTIALLY_APPROVED`.

## 2. Entscheidungen

- **Zwei-Schritt-Upload** statt Multipart-durch-die-App: der Client lädt direkt
  gegen den (lokalen) Storage — derselbe Ablauf wie später mit S3/R2/Supabase
  signed URLs. Kein Byte-Proxying durch Next.js.
- **`storageKey` als Capability**: die lokale Upload-/Download-URL ist das
  Dev-Äquivalent einer signierten URL (unguessbarer UUID-Key, Attachment muss
  existieren). In Prod übernehmen echte signierte Provider-URLs.
- **Aggregation server-seitig** als reine Funktion → ein Wahrheitsort, testbar,
  kein Vertrauen in den Client.
- **Reminder ohne Scheduler im Produkt** — bewusst extern getaktet, lokal per
  Endpoint auslösbar.

## 3. Was Mock/Placeholder blieb

- Uploads/Downloads laufen im `local`-Treiber über die API; die Cloud-Treiber
  (`supabase`, `r2`) sind weiterhin Platzhalter (`TODO PROVIDER SETUP`).
- Foto-Upload im **Erstell-Formular** wurde bewusst auf die Detailseite verlagert
  (nach dem Anlegen) — einfacher, robuster; die Positionsanlage im Formular ist
  unverändert mehrfach möglich.
- SMS-Versand weiterhin nur strukturell vorbereitet.
- Kein Bild-Reencoding/Thumbnailing/EXIF-Stripping (Deferred, siehe Risiken).
- Reminder-Kadenz global pro Tenant (ENV), nicht pro Fall.

## 4. Später nötige Credentials/Accounts

- Für produktiven Foto-Storage: Supabase Storage **oder** Cloudflare R2
  (`STORAGE_DRIVER` + Keys, siehe `docs/env-and-secrets.md`).
- Für realen E-Mail-Versand der Erinnerungen/Uploads: `EMAIL_PROVIDER=resend`
  + `RESEND_API_KEY`.
- Für getaktete Erinnerungen: ein externer Scheduler + API-Key (`members:manage`).

## 5. Risiken

- Der lokale Upload-Endpoint ist unauthentifiziert (Capability-URL) — nur für
  Dev/`local` gedacht und nur dann registriert; in Prod signierte Provider-URLs.
- Kein serverseitiges Bild-Reencoding: hochgeladene Bytes werden as-is gespeichert
  und ausgeliefert (Content-Type wird gesetzt, aber nicht erzwungen validiert).
  Für Prod: Reencode/Thumbnail + EXIF-Stripping ergänzen.
- `PARTIALLY_APPROVED` ist terminal — nach der Einzelfreigabe kein Nachentscheid
  mehr (bewusst; Änderungswünsche laufen über Rückruf/neuen Fall).
- Attachment-/Upload-Aufräumung (verwaiste, nie hochgeladene Rows) braucht später
  einen Cleanup-Job (mit Idempotency/Webhook-Retention, Block 9).

## 6. Nächster Block

**Block 9 — Qualitäts- & Betriebsreife:** automatisierte Tests/CI, Observability/
Logging/Fehler-Monitoring-Vorbereitung, Performance/Pagination-Feinschliff,
Retention-/Cleanup-Jobs (Idempotency/Webhooks/Attachments) sowie
Barrierefreiheit und finaler UX-Polish. Prompt im Handoff.
