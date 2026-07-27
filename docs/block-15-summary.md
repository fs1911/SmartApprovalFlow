# Block 15 — Summary (Mandantenfähige Skalierung & Datenlebenszyklus)

Baut auf Block 1–14 auf, ohne Kernflows umzubauen. Ziel: DSGVO-nahe Exporte und
Löschung, Aufbewahrungsrichtlinien, ein Admin-Überblick und eine
mitgliedschaftsbasierte Workspace-Liste. Lokal ohne externe Accounts.

## 1. Was gebaut wurde

### Datenexport & Löschung (DSGVO)
- `GET /approval-cases/:id/export` und `GET /customers/:id/export` liefern
  portables JSON (reine `shapeCaseExport`), `data:manage` (OWNER/ADMIN).
- `DELETE /approval-cases/:id?confirm=true` und `DELETE /customers/:id?confirm=true`
  löschen unwiderruflich (Cascade über FKs), erfordern `confirm` (sonst 422) und
  schreiben ein tenant-weites `DATA_ERASED`-Audit-Event.
- Web: Fall-Detailseite mit „Daten exportieren" (same-origin Route-Handler) und
  „Fall löschen" (Bestätigungs-Flow), nur bei `data:manage`.

### Aufbewahrung (Retention)
- Cleanup-Policy aus Block 9 erweitert: optionales `RETENTION_CASE_MONTHS`
  (Default 0 = aus) löscht bei `POST /maintenance/cleanup` **terminale** Fälle
  nach N Monaten. Reine `caseRetentionCutoff`.

### Admin-Überblick & Workspaces
- `GET /admin/overview` (`members:manage`): Mitglieder (+ Einladungen),
  Kund:innen, Fälle nach Status, Foto-Anzahl + Speicherbytes, Plan, Retention.
  Web: „Admin-Überblick"-Karte in den Einstellungen.
- `GET /workspaces`: mitgliedschaftsbasierte Workspace-Liste des Nutzers
  (mit Rolle + `current`).

### RBAC
- Neue Berechtigung `data:manage` (Teil von `ALL` → nur OWNER/ADMIN).

### Tests
- Unit: `caseRetentionCutoff`, `shapeCaseExport`.
- Integration (inject): Fall-Export + Advisor-403; Fall-Löschung (confirm-Pflicht
  → 404 danach); Kunden-Löschung kaskadiert; Admin-Overview-Shape + 403;
  Workspaces-Liste. 93 API-Tests grün.

## 2. Entscheidungen

- **`data:manage` als eigene Berechtigung** statt Wiederverwendung von
  `members:manage` — GDPR-Aktionen sind klar abgegrenzt (bleiben OWNER/ADMIN).
- **Harte Löschung mit `confirm`** + Audit statt Soft-Delete — ehrliche Erasure;
  der Audit-Trail belegt die Löschung ohne die Rohdaten zu behalten.
- **Retention opt-in** (Default 0) — keine überraschenden Auto-Löschungen.
- **Workspace-Liste mitgliedschaftsbasiert**, aber echtes Multi-Tenant-Login
  bewusst zurückgestellt (User bleibt tenant-gebunden, adr-003) — keine
  Architektur-Umstellung.

## 3. Was Mock/Placeholder blieb

- Kein Workspace-Switching / Nutzer in mehreren Tenants (Endpoint zukunftsfähig).
- Löschung ist hart (keine Anonymisierungs-Option).
- Retention/Cleanup on-demand (kein Cron), wie die übrigen Maintenance-Läufe.

## 4. Später nötige Credentials/Accounts

- Keine — alles lokal aus den eigenen Daten.

## 5. Risiken

- Harte Löschung ist unwiderruflich; UI erzwingt eine Bestätigung, API verlangt
  `?confirm=true`, Berechtigung auf OWNER/ADMIN beschränkt.
- Aktivierte Fall-Retention löscht endgültig — konservativer Default (0/aus) und
  nur terminale Fälle.
- Export enthält personenbezogene Daten (Kunde/Fahrzeug/Entscheide) → nur
  `data:manage`; Download läuft über den authentifizierten same-origin Handler.

## 6. Nächster Block

**Block 16 — Barrierefreiheit, Lokalisierung & finaler Produktschliff:** WCAG-
Feinschliff (Tastatur/Screenreader/Kontrast), Mehrsprachigkeit-Grundlage
(de/fr/it für die Kundenseite), konsistente Leerzustände/Fehlerseiten und ein
End-to-End-Politur-Durchlauf — weiterhin so weit wie möglich ohne externe
Live-Accounts. Prompt im Handoff.
