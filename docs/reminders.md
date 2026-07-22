# Reminder-Policy (Block 8)

Automatische Erinnerungen für Fälle, die nach dem Versand ohne Kundenreaktion
offen bleiben. Ziel: die Freigabequote erhöhen, ohne Personal zu binden — und
ohne den Kunden zu überfrachten (harte Obergrenze).

## Policy

Rein konfigurierbar über ENV; die Entscheidung ist eine **reine Funktion**
(`decideReminder` in `apps/api/src/lib/reminders.ts`, unit-getestet):

| Variable | Default | Bedeutung |
| --- | --- | --- |
| `REMINDER_ENABLED` | `true` | Schalter für die gesamte Policy. |
| `REMINDER_FIRST_AFTER_HOURS` | `24` | Stunden nach Versand bis zur 1. Erinnerung. |
| `REMINDER_REPEAT_EVERY_HOURS` | `48` | Abstand zwischen weiteren Erinnerungen. |
| `REMINDER_MAX` | `3` | Maximale Anzahl Erinnerungen pro Fall. |

Regeln (in dieser Reihenfolge):

1. Policy deaktiviert → nichts senden.
2. Fall nicht mehr offen (nur `SENT`/`VIEWED`/`CALLBACK` gelten) → nichts.
3. Kunde ohne E-Mail-Adresse → nichts (SMS ist noch nicht aktiv).
4. `reminderCount >= REMINDER_MAX` → Obergrenze erreicht, nichts.
5. Fall nie gesendet (`sentAt` null) → nichts.
6. Erste Erinnerung: fällig, wenn `sentAt + FIRST_AFTER_HOURS <= jetzt`.
7. Weitere: getaktet ab `lastReminderAt` (Fallback `sentAt`) + `REPEAT_EVERY_HOURS`.

## Auslösung (kein Cron-Zwang)

Der Versand wird **on demand** über einen Endpoint angestossen:

```
POST /api/v1/reminders/run        (Berechtigung: members:manage)
```

Der Endpoint wertet alle offenen Fälle des Tenants gegen die Policy aus und
sendet die fälligen. Antwort: `{ policy, evaluated, sent, skipped, details[] }`.
Er ist **idempotent nach Timing** — ein soeben erinnerter Fall ist nicht sofort
wieder fällig, ein erneuter Aufruf sendet also nicht doppelt.

### Scheduler-Anbindung

Der Aufruf lässt sich beliebig takten, z. B.:

- **Cron / systemd-Timer / Cloud-Scheduler**: stündlich `curl -X POST …/reminders/run`
  mit einem API-Key (Scope `members:manage`).
- **Claude Code Routine / `send_later`**: eine wiederkehrende Aufgabe, die den
  Endpoint aufruft.
- **Manuell**: aus dem Betrieb heraus jederzeit auslösbar.

Der eigentliche Versand teilt sich den Code-Pfad mit der manuellen Erinnerung
(`sendReminder` in `lib/case-messaging.ts`) — Vorlage, Link-Rotation, Audit-
Eintrag (`CASE_REMINDER_SENT`, Actor `system (auto-reminder)`), Zähler und das
Domain-Event `approval_case.reminder_sent` (`data.auto = true`) sind identisch.

## Grenzen / Deferred

- Kadenz und Obergrenze sind **pro Tenant global** (ENV), noch nicht pro Fall
  oder pro Dringlichkeit konfigurierbar.
- Kein eigener Scheduler im Produkt — bewusst extern gehalten (siehe oben).
- SMS-Erinnerungen sind vorbereitet, aber noch nicht transportiert.
