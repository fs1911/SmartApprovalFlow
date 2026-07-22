# Retention & Cleanup (Block 9)

Aufräumen von Datensätzen, die sicher gelöscht werden können — hält Tabellen, die
sonst unbegrenzt wachsen, klein. Rein testbare Policy + Trigger-Endpoint, kein
Cron-Zwang (gleiches Muster wie die Reminder-Policy).

## Was aufgeräumt wird

| Datensatz | Bedingung | ENV-Schwelle |
| --- | --- | --- |
| `IdempotencyRecord` | `expiresAt < jetzt` (bereits abgelaufen) | — (record-eigene TTL) |
| `WebhookDelivery` | Status `SENT`/`DELIVERED`/`FAILED` **und** älter als N Tage | `RETENTION_WEBHOOK_DAYS` (30) |
| `Attachment` (verwaist) | nie hochgeladen (`uploadedAt = null`) **und** älter als N Stunden | `RETENTION_ORPHAN_ATTACHMENT_HOURS` (24) |

Bewusst **nicht** angetastet: der Audit-Trail (`AuditEvent`, revisionssicher),
laufende Fälle, hochgeladene Attachments, noch nicht zugestellte Webhooks
(`QUEUED`). Alle Deletes sind **tenant-scoped**.

Die reine Funktion `retentionCutoffs(policy, now)` (in `lib/retention.ts`)
berechnet die Stichzeitpunkte und ist unit-getestet; `runCleanup(tenantId)`
wendet sie in einer Transaktion an.

## Auslösung

```
POST /api/v1/maintenance/cleanup      (Berechtigung: members:manage)
```

Antwort: `{ policy, idempotencyRemoved, webhookDeliveriesRemoved,
orphanAttachmentsRemoved }`. Idempotent nach Timing (ein zweiter Aufruf löscht
nichts Neues) und wird zusätzlich strukturiert geloggt.

### Scheduler-Anbindung

Wie bei den Erinnerungen extern getaktet:

- **Cron / systemd-Timer / Cloud-Scheduler**: z. B. täglich
  `curl -X POST …/maintenance/cleanup` mit einem API-Key (Scope `members:manage`).
- **Claude Code Routine / `send_later`**: wiederkehrende Aufgabe.
- **Manuell**: aus dem Betrieb heraus jederzeit auslösbar.

## Grenzen / Deferred

- Schwellen sind **pro Tenant global** (ENV), nicht pro Fall/Dringlichkeit.
- Kein produkteigener Scheduler (bewusst extern).
- Objekt-Bytes verwaister Attachments liegen nur im `local`-Treiber lokal; für
  Cloud-Storage später zusätzlich einen Bucket-Lifecycle/Objekt-Cleanup ergänzen.
