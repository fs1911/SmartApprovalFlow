# Block 12 — Summary (Integrations- & API-Ökosystem)

Baut auf Block 1–11 auf, ohne Kernflows umzubauen. Ziel: Partner/Garagensoftware
binden Klarwerk ohne manuelle Hilfe an — Fälle per API-Key erstellen,
Events per selbst verwalteten Webhooks empfangen. Kein Schemaänderung nötig.

## 1. Was gebaut wurde

### Ausgehende Webhooks (Self-Service)
- CRUD für `WebhookEndpoint` (`members:manage`): anlegen (Secret **einmalig**),
  listen (ohne Secret), aktualisieren (URL/Events/aktiv), **Secret rotieren**,
  **Testzustellung** (signiert, gezielt via neuem `deliverNow`), **Zustellungen**
  je Endpoint (Cursor-Pagination), löschen.
- Signatur/Retry aus Block 7 wiederverwendet; Event-Allowlist als reine,
  getestete Funktion `matchesEventAllowlist` (auch vom Event-Publisher genutzt).

### Eingehende Integration (API-Key)
- Fall-Erstellung per API-Key mit Scopes funktioniert sauber (Validierung,
  Idempotency-Key, RBAC über Scopes, Plan-Enforcement); fehlender Scope → 403.
- `GET /integration/whoami` zeigt Tenant, Auth-Methode und Permissions/Scopes —
  einfache Verifikation vor dem Bau.

### Developer-Experience / Doku
- OpenAPI/Swagger unter `/docs` deckt jetzt 56 Operationen ab.
- `docs/integrations-guide.md`: Getting-Started, Auth (API-Key), Idempotency,
  Webhook-Signaturprüfung (Node-Snippet) und curl-Rezepte (Fall erstellen,
  Webhook empfangen/verifizieren, lokal gegen den Dev-Sink testen).

### Web
- Einstellungen → **Entwickler & Integrationen**: API-Keys (erstellen mit
  Scope-Auswahl, listen, widerrufen, Klartext einmalig) und Webhook-Endpoints
  (anlegen, Event-Auswahl, Test senden, Secret rotieren, aktiv/inaktiv, löschen).

### Tests
- Unit: `matchesEventAllowlist` (leer/spezifisch/Whitespace).
- Integration (inject): Webhook-Endpoint-CRUD + Rotate + Test-Zustellung +
  Deliveries + RBAC; eingehend: API-Key `whoami` + Fall-Erstellung + Scope-
  Verweigerung. 66 API-Tests grün.

## 2. Entscheidungen

- **Kein Schemaänderung** — die vorhandenen `WebhookEndpoint`/`WebhookDelivery`/
  `ApiKey`-Modelle reichen.
- **`deliverNow(id)`** für die Testzustellung, damit die frisch erzeugte
  Zustellung unabhängig von einem Backlog sofort verarbeitet wird (Bug beim
  ursprünglichen `deliverPending()`-Ansatz behoben).
- **Event-Matcher als reine Funktion** — ein Wahrheitsort für Publisher und UI.
- **Webhook-Secret gespeichert** (zum Signieren nötig), nur bei Erstellung/
  Rotation angezeigt.

## 3. Was Mock/Placeholder blieb

- Der Dev-Sink verifiziert gegen ein festes Secret; eine echte Testzustellung an
  ihn zeigt „empfangen", aber die Signaturprüfung im Sink schlägt fehl, weil er
  das zufällige Endpoint-Secret nicht kennt — für echte Empfänger irrelevant.
- Keine eingehenden Provider-Webhooks ausser Billing (Block 11).

## 4. Später nötige Credentials/Accounts

- Keine — der gesamte Flow läuft lokal (lokale API-Keys, Dev-Sink).

## 5. Risiken

- Webhook-Signatur-Secrets liegen im Klartext in der DB (nötig zum Signieren) —
  produktiv Verschlüsselung at-rest ergänzen.
- `WebhookDelivery`-Tabelle wächst; die Retention-Cleanup-Policy (Block 9) räumt
  terminale Zustellungen auf.
- Testzustellung macht einen echten HTTP-Call an die konfigurierte URL — bei
  unerreichbaren URLs erwartet langsam/Retry (Timeout 10 s).

## 6. Nächster Block

**Block 13 — Reporting- & Insights-Ausbau:** aussagekräftige Kennzahlen/Trends
(Freigabequote, Reaktionszeiten, Umsatz aus freigegebenen Positionen),
Zeitraum-Filter, CSV-Export und ein verständliches Dashboard — weiterhin so weit
wie möglich ohne externe Live-Accounts. Prompt im Handoff.
