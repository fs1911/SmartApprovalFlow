# Benachrichtigungen & Kollaboration (Block 14)

Das Team arbeitet Fälle koordiniert ab: interne In-App-Benachrichtigungen,
Fall-Zuweisung, interne Notizen. Alles in-App (DB-gestützt), ohne externe
Accounts. Externe Kanäle (E-Mail) bleiben optional über die Notification-
Abstraktion (console-Default).

## In-App-Benachrichtigungen

Erzeugt bei relevanten Ereignissen — non-fatal (ein Fehler bei der
Benachrichtigung bricht nie die zugrunde liegende Aktion, wie beim Webhook-
Publisher).

| Ereignis | Notification-Typ | Empfänger |
| --- | --- | --- |
| Kunde gibt frei / teilweise / lehnt ab / Rückruf | `CASE_APPROVED` / `CASE_PARTIALLY_APPROVED` / `CASE_DECLINED` / `CASE_CALLBACK` | Ersteller + Assignee |
| Fall abgelaufen | `CASE_EXPIRED` | Ersteller + Assignee |
| Fall zugewiesen | `CASE_ASSIGNED` | neuer Assignee (ausser Selbstzuweisung) |
| Interne Notiz hinzugefügt | `CASE_NOTE_ADDED` | Ersteller + Assignee (ausser Autor) |

Empfänger-Bestimmung ist eine reine, unit-getestete Funktion
(`uniqueRecipients`): dedupliziert, verwirft Nulls und schliesst den Auslöser aus.

### Endpoints (nutzerbezogen; API-Keys sehen eine leere Liste)

```
GET  /api/v1/notifications              (?unread=true, Cursor-Pagination)
GET  /api/v1/notifications/unread-count
POST /api/v1/notifications/:id/read
POST /api/v1/notifications/read-all
```

Web: Glocke im Topbar mit Ungelesen-Badge → `/notifications` (Liste, „alle
gelesen", Deep-Links zum Fall).

## Fall-Zuweisung

```
POST /api/v1/approval-cases/:id/assign   { assigneeUserId: string | null }   (cases:send)
```

Der Assignee muss Mitglied des Workspace sein; `null` hebt die Zuweisung auf.
Zuweisung schreibt ein Audit-Event und benachrichtigt den neuen Assignee.
Liste filterbar via `GET /approval-cases?assignee=me`; im Web „Meine Fälle".

## Interne Notizen

```
POST /api/v1/approval-cases/:id/notes    { body }   (cases:annotate)
```

Notizen (`CaseNote`) sind **rein intern** — sie erscheinen in der Detailansicht/
Timeline, aber **niemals** auf der loginlosen Kundenseite (die Public-View liest
`CaseNote` nicht; ein Integrationstest sichert das ab). Jede Notiz benachrichtigt
Ersteller + Assignee (ausser dem Autor).

## Grenzen / Deferred

- Benachrichtigungen sind in-App; ein optionaler E-Mail-Digest über die
  Notification-Abstraktion ist vorbereitet, aber nicht aktiviert.
- Kein Echtzeit-Push (Polling beim Seitenaufruf); WebSockets/SSE später.
- Keine Benachrichtigungs-Einstellungen pro Nutzer (Stummschaltung) — später.
- Zuweisung ist einfach (ein Assignee pro Fall), keine Teams/Rollen-Routing.
