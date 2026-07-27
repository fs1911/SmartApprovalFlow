# Datenlebenszyklus & Mandantenfähigkeit (Block 15)

DSGVO-nahe Datenexporte und -löschung, Aufbewahrungsrichtlinien und ein
Admin-Überblick. Alles tenant-scoped und lokal ohne externe Accounts nutzbar.

## Berechtigung

Export/Löschung erfordern die neue Berechtigung **`data:manage`** — sie ist Teil
von `ALL` und damit nur für **OWNER/ADMIN** gesetzt (Advisor/Technician/Viewer
nicht). Der Admin-Überblick nutzt `members:manage`.

## Datenexport (Auskunft)

```
GET /api/v1/approval-cases/:id/export   (data:manage)   ein Fall als JSON
GET /api/v1/customers/:id/export        (data:manage)   Kunde + alle Fälle
```

Portables JSON (ISO-Zeitstempel) mit Fall, Positionen, Entscheiden, Attachment-
Metadaten und Audit-Trail. Antwort trägt `Content-Disposition: attachment`.
Reine Shaping-Funktion `shapeCaseExport` (unit-getestet). Im Web: Button
„Daten exportieren" auf der Fall-Detailseite (same-origin Route-Handler, Auth
serverseitig).

## Löschung (Erasure)

```
DELETE /api/v1/approval-cases/:id?confirm=true   (data:manage)
DELETE /api/v1/customers/:id?confirm=true        (data:manage)
```

- **Unwiderruflich** und erfordert `?confirm=true` (sonst `422`).
- Fall-Löschung entfernt den Fall inkl. Positionen, Fotos, Entscheiden, Notizen,
  Audit und Benachrichtigungen (Cascade via FKs).
- Kunden-Löschung entfernt zusätzlich alle Fälle des Kunden und seine Fahrzeuge.
- Jede Löschung schreibt ein **tenant-weites `DATA_ERASED`-Audit-Event**
  (mit Metadaten, ohne die gelöschten Rohdaten).

## Aufbewahrung (Retention)

Erweitert die Cleanup-Policy aus Block 9. Zusätzlich zu Idempotency/Webhooks/
verwaisten Attachments werden — **nur wenn aktiviert** — terminale (abgeschlossene)
Fälle nach `RETENTION_CASE_MONTHS` Monaten gelöscht:

| Variable | Default | Wirkung |
| --- | --- | --- |
| `RETENTION_CASE_MONTHS` | `0` | `0` = deaktiviert; `>0` = terminale Fälle, zuletzt geändert vor N Monaten, werden bei `POST /maintenance/cleanup` gelöscht. |

Nur `APPROVED`, `PARTIALLY_APPROVED`, `DECLINED`, `EXPIRED`, `CANCELLED` sind
löschbar — laufende Fälle nie. Cutoff-Logik als reine Funktion
(`caseRetentionCutoff`).

## Admin-Überblick

```
GET /api/v1/admin/overview   (members:manage)
```

Workspace-Kennzahlen: Mitglieder (+ offene Einladungen), Kund:innen, Fälle nach
Status, Foto-Anzahl + Speicherbytes, aktueller Plan und die Retention-Policy.
Im Web als „Admin-Überblick"-Karte in den Einstellungen.

## Workspaces / Mehrfach-Mitgliedschaft

```
GET /api/v1/workspaces   (auth)
```

Listet die Workspaces des angemeldeten Nutzers aus seinen Mitgliedschaften
(mit Rolle, `current`-Flag). **MVP-Grenze:** ein Nutzer gehört zu genau einem
Tenant (adr-003); der Endpoint ist bereits mitgliedschaftsbasiert, sodass echte
Mehrfach-Workspaces später **nicht-brechend** ergänzt werden können. Ein
Workspace-Wechsel (mehrere Tenants pro Login) ist bewusst zurückgestellt.

## Grenzen / Deferred

- Kein Workspace-Switching / echte Multi-Tenant-Nutzer (User ist tenant-gebunden).
- Löschung ist ein harter Delete (keine „Soft-Delete"/Anonymisierung als Option).
- Retention-Job wird on-demand ausgelöst (kein Cron), wie die übrigen
  Maintenance-Läufe.
