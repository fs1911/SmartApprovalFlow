# Block 14 — Summary (Benachrichtigungen & Kollaboration)

Baut auf Block 1–13 auf, ohne Kernflows umzubauen. Ziel: das Team arbeitet Fälle
koordiniert ab — In-App-Benachrichtigungen, Fall-Zuweisung, interne Notizen.
Alles in-App (DB), ohne externe Accounts.

## 1. Was gebaut wurde

### Benachrichtigungen
- `Notification`-Modell (nutzerbezogen) + Erzeugung bei Kundenentscheid
  (approved/partial/declined/callback), Ablauf, Zuweisung und interner Notiz —
  **non-fatal** (wie der Webhook-Publisher). Empfänger-Bestimmung als reine,
  getestete Funktion `uniqueRecipients` (dedup, Null-Filter, Actor-Ausschluss).
- API: `GET /notifications` (Cursor, `?unread`), `/unread-count`, `/:id/read`,
  `/read-all` (nutzerbezogen; API-Keys sehen leer).
- Web: Topbar-Glocke mit Ungelesen-Badge + `/notifications`-Seite (Liste,
  „alle gelesen", Deep-Links).

### Fall-Zuweisung
- `ApprovalCase.assigneeUserId` (additiv) + `POST /approval-cases/:id/assign`
  (`cases:send`, Mitglied-Validierung, Audit, benachrichtigt Assignee).
- Listen-Filter `?assignee=me` → im Web „Meine Fälle"; Assignee in Liste + Detail.

### Interne Notizen
- `CaseNote`-Modell + `POST /approval-cases/:id/notes` (`cases:annotate`).
  Notizen erscheinen in der internen Detailansicht, **nie** auf der loginlosen
  Kundenseite (Public-View liest sie nicht — durch Integrationstest abgesichert).
- Web: „Team & Notizen"-Card auf der Detailseite (Assignee-Auswahl + Notizliste
  + Eingabe).

### Tests
- Unit: `uniqueRecipients` (3). Integration (inject, mit echten Nutzer-Sitzungen
  über `loginToken`): Kundenentscheid benachrichtigt Ersteller; read/read-all;
  Zuweisung benachrichtigt Assignee + „meine Fälle"; Notiz intern sichtbar, nicht
  in der Public-View. 85 API-Tests grün.

## 2. Entscheidungen

- **In-App zuerst**, DB-gestützt — kein externer Kanal nötig; E-Mail-Digest über
  die vorhandene Abstraktion später aktivierbar.
- **Empfänger-Logik rein & getestet**, Erzeugung non-fatal.
- **Notizen strikt intern** — die Public-View liest `CaseNote` bewusst nicht;
  ein Test verhindert Leckage.
- **Nutzer-Sitzung nötig** für Benachrichtigungen (Dev-Header/API-Keys tragen
  keine `userId` → leere Liste); Tests nutzen echte Logins.

## 3. Was Mock/Placeholder blieb

- Kein Echtzeit-Push (Polling beim Seitenaufruf); WebSockets/SSE später.
- Keine Pro-Nutzer-Benachrichtigungseinstellungen (Stummschaltung).
- Zuweisung: ein Assignee pro Fall, kein Team-Routing.
- Kein E-Mail-Versand der Benachrichtigungen (nur in-App).

## 4. Später nötige Credentials/Accounts

- Keine — alles läuft lokal. Optionaler E-Mail-Digest bräuchte später Resend.

## 5. Risiken

- `Notification`-Tabelle wächst; eine Retention-Policy (Block 9-Muster) für alte
  gelesene Benachrichtigungen wäre sinnvoll (Deferred).
- Ungelesen-Zähler wird beim Seitenaufruf geladen (kein Live-Update).
- Notizen sind sichtbar für alle mit `cases:read`; keine feinere Sichtbarkeit.

## 6. Nächster Block

**Block 15 — Mandantenfähige Skalierung & Datenlebenszyklus:** Workspace-
Verwaltung/Mehrfach-Mitgliedschaften, DSGVO-nahe Datenexporte/-löschung pro
Kunde/Fall, Aufbewahrungsrichtlinien und ein Admin-Überblick — weiterhin so weit
wie möglich ohne externe Live-Accounts. Prompt im Handoff.
