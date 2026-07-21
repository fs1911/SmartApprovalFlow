# Block 4 — Summary (Multi-Tenant-B2B-Reife)

Baut auf Block 1–3 auf, ohne Architektur oder Kernflows umzubauen. Ziel: das
Produkt organisatorisch und architektonisch für echten Multi-Tenant-B2B-Betrieb
reifer machen — RBAC, Tenant-Isolation, Workspace/Mitglieder, White-Label,
Reporting.

## 1. Was in Block 4 gebaut wurde

### Rollen & Berechtigungen (tenant-scoped RBAC)
- Kontrolliertes Rollenmodell mit **fünf** Rollen: `OWNER`, `ADMIN`,
  `SERVICE_ADVISOR` (Advisor), `TECHNICIAN`, `VIEWER`.
- **Feste Permission-Matrix** in `@saf/types` (`ROLE_PERMISSIONS`), geteilt von
  API und Web — eine Quelle der Wahrheit.
- API-Durchsetzung über `requirePermission(...)` an jeder Route; `/me` liefert
  Rolle, Label und Permissions ans Frontend.
- Web: Navigation und Aktionen sind **permission-gated** (z. B. „Neue Freigabe"
  nur mit `cases:create`, „Auswertung"/„Team" nur mit den passenden Rechten);
  serverseitige Guards leiten unberechtigte Direktaufrufe um.
- **Demo-Rollenumschalter** im Topbar, damit RBAC in der laufenden App erlebbar
  ist (verschwindet mit echter Auth in Block 5).

### Tenant-Isolation gehärtet
- **Membership-aware Auth-Kontext:** Rolle kommt aus der Mitgliedschaft im
  aktuellen Tenant (Dev: `x-saf-user`); ohne Mitgliedschaft → `403`.
- Jede Query filtert nach `tenantId` aus dem Auth-Kontext (nie aus der URL);
  Ressourcen-Lookups sind `{ id, tenantId }` → Cross-Tenant-Zugriff ergibt `404`.
- Owner-Guardrails: nur Owner vergibt `OWNER`; letzter Owner nicht herabstufbar.

### Mitglieder- & Workspace-Verwaltung
- `GET /members`, `PATCH /members/:id` (Rollenzuweisung mit Guardrails).
- `GET /workspace`, `PATCH /workspace` (Name, Branding, Kontakt, Locale/Currency).
- Web: **Team**-Seite (Mitglieder + Rollenwechsel) und **Einstellungen** mit
  Branding-Formular.

### White-Label-/Branding-Grundlagen
- Tenant-Felder `brandName`, `brandColor`, `contactEmail`, `contactPhone`.
- Die **öffentliche Kundenseite** nutzt die Markenfarbe als Akzent und zeigt den
  Kontakt der Werkstatt — sichtbare Partner-/White-Label-Fähigkeit.

### Reporting
- `GET /reporting/summary`: Freigabequote, Ø Reaktionszeit (Senden→Entscheid),
  offene Fälle, Versand der letzten 7 Tage, heute beantwortet, Status-Verteilung.
- Web: **Auswertung**-Seite mit KPI-Kacheln.

### Robustheit
- Error-Handler mappt Fastify-4xx (z. B. defektes JSON) sauber auf `400`
  statt `500`.

## 2. Getroffene Annahmen / Entscheidungen

- **Kontrolliertes Rollenset statt Custom Roles** (MVP-tauglich, sicher).
- **`SERVICE_ADVISOR` als Enum-Wert beibehalten**, Anzeigename „Advisor" —
  kein Enum-Rename (unnötiger Daten-/Code-Churn). Siehe adr-004.
- **OWNER = ADMIN** bei den Permissions; die Owner-Exklusivität liegt in
  Business-Regeln (OWNER-Rolle vergeben, Letzter-Owner-Schutz), nicht in einer
  separaten Permission.
- Rollenumschaltung im Web erfolgt über ein Cookie (Dev-Mechanik), damit RBAC
  ohne echtes Login demonstrierbar ist.

## 3. Bewusst einfach gehalten

- Keine E-Mail-Einladungen von Mitgliedern (nur bestehende anzeigen/ändern).
- Keine feingranularen Ressourcen-ACLs (Rollen genügen im MVP).
- `cases:annotate` (Notizen/Anhänge) ist als Permission definiert, die
  zugehörigen Endpoints kommen mit dem Portal-Ausbau.
- Reporting ist eine schlanke Kennzahlen-Übersicht, kein Analytics-Werkzeug.
- Auth bleibt Dev-Stub; Idempotency In-Memory.

## 4. Risiken / technische Schulden

- **Dev-Auth-Stub** darf nicht in Produktion — Block 5 ersetzt nur
  `auth-context.ts`; die Permission-Matrix bleibt.
- **Tenant-Isolation** hängt an disziplinierter `tenantId`-Filterung; optional
  später Postgres Row-Level-Security als zweite Verteidigungslinie.
- Rollenumschalt-Cookie ist reine Demo-Mechanik und entfällt mit echter Auth.

## 5. Nächster Block

**Block 5 — Auth- & Integrations-Härtung:**
1. Echte Auth (JWT-Sessions + API-Keys/Scopes), Rate-Limiting, persistente
   Idempotency — Austausch nur in `auth-context.ts`/Idempotency-Store.
2. Echte Webhook-Zustellung (HMAC-Signatur, Retry/Backoff) + Registrierungs-UI.
3. Optional: Postgres RLS als zweite Isolations-Linie, Mitglieder-Einladungen
   per E-Mail.
