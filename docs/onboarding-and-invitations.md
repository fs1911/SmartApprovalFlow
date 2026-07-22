# Onboarding & Einladungen (Block 10)

Ziel: eine neue Werkstatt kommt ohne manuelle Hilfe vom Login zum ersten
versendeten Freigabefall — und kann Kolleg:innen selbst einladen. Alles lokal
ohne externe Accounts testbar (Einladungs-/Reset-Links erscheinen im console-Log).

## Sichere Tokens (Einladung & Reset)

Ein einziges `VerificationToken`-Modell trägt beide Flows (`type` =
`INVITE` | `PASSWORD_RESET`). Sicherheitsposition wie bei den Kundenlinks:

- 256-Bit-Zufallstoken; **nur der SHA-256-Hash** wird gespeichert, der Klartext
  lebt ausschliesslich im verschickten Link.
- **Einmalig**: `consumedAt` sperrt den Token nach Nutzung.
- **Ablauf**: `expiresAt` (Einladung 7 Tage, Reset 2 Stunden — ENV-konfigurierbar).
- **Widerrufbar**: `revokedAt` (Einladung zurückziehen; alte Einladung/Reset wird
  bei einer neuen automatisch überschrieben).
- Gültigkeit ist eine reine, unit-getestete Funktion (`isTokenValid`).

## Einladungs-Flow

```
POST   /api/v1/invitations          (members:manage)  erstellen + E-Mail
GET    /api/v1/invitations          (members:read)    offene listen
DELETE /api/v1/invitations/:id      (members:manage)  widerrufen
POST   /api/v1/invitations/accept   (loginlos)        Passwort setzen → Session
```

- Owner/Admin lädt per E-Mail + Rolle ein (die **Inhaber-Rolle** ist per
  Einladung ausgeschlossen). Bereits vorhandene Mitglieder werden abgelehnt.
- Der/die Eingeladene öffnet `/invite/{token}`, setzt Name + Passwort → Nutzer
  und Mitgliedschaft werden angelegt, der Token verbraucht, und es kommt direkt
  eine **Session** zurück (Auto-Login).
- Im **Development** liefert die Erstell-Antwort zusätzlich `acceptUrl`, damit der
  Flow ohne echtes Postfach testbar ist; in Produktion nur der E-Mail-Link.

## Passwort-Reset-Flow

```
POST /api/v1/auth/forgot-password   (loginlos, rate-limited)  Link anfordern
POST /api/v1/auth/reset-password    (loginlos, rate-limited)  neues Passwort
```

- `forgot-password` antwortet **immer** `200` — unabhängig davon, ob die E-Mail
  existiert (Schutz gegen **User-Enumeration**). Existiert ein aktiver Nutzer,
  geht ein Reset-Link raus.
- `reset-password` prüft den Token (Typ, Ablauf, nicht verbraucht/widerrufen),
  setzt das neue Passwort, verbraucht den Token und widerruft übrige offene
  Reset-Tokens desselben Nutzers.
- Beide Endpoints sind mit dem strengeren Login-Rate-Limit gedeckelt.

## Geführtes Onboarding

```
GET  /api/v1/onboarding              (workspace:read)  Checkliste + Aktivierung
POST /api/v1/onboarding/sample-case  (cases:create)    risikofreier Beispiel-Fall
```

Die Checkliste wird **aus dem vorhandenen Zustand abgeleitet** (kein
gespeicherter Fortschritt → immer korrekt, kein Backfill): Branding gesetzt?
Team eingeladen? erster Fall? erster Versand? erste Kundenreaktion? Die reine
Funktion `computeOnboarding` liefert Schritte, Fortschritt, nächsten Schritt und
das Flag `complete`.

Im Web erscheint das **Onboarding-Widget** im Dashboard, solange nicht alle
Schritte erledigt sind, und verschwindet danach von selbst.

## Aktivierungsmetrik

`activated = hasSentCase && hasResponse` — der „Aha-Moment": ein Fall wurde
gesendet **und** ein Kunde hat reagiert. Datensparsam aus Audit-/Case-Daten
abgeleitet, kein externes Tracking. Sichtbar im Onboarding-Endpoint.

## Grenzen / Deferred

- E-Mail-Versand über den console-Provider (Default); Resend real anschliessbar.
- Keine Selbst-Registrierung „from scratch" (neue Werkstatt/Tenant per Signup) —
  Tenants werden weiterhin geseedet/provisioniert; Einladungen erweitern ein
  bestehendes Workspace. Self-Signup ist ein späterer Schritt.
- Keine E-Mail-Verifikation der Adresse getrennt vom Einladungs-/Reset-Token.
