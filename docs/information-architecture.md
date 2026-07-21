# Information Architecture

## App-Navigation (intern)

```
Sidebar (permission-gated)
├── Übersicht        /dashboard      Kennzahlen + neueste Fälle
├── Freigaben        /approvals      Liste aller Fälle
│   ├── Neu          /approvals/new  Fall erstellen        (cases:create)
│   └── Detail       /approvals/:id  Fall + Audit + Versand/Kundenlink (cases:send)
├── Auswertung       /reporting      Operative Kennzahlen  (reporting:read)
├── Team             /members        Mitglieder + Rollen   (members:read/-:manage)
└── Einstellungen    /settings       Branding + Vorlagen   (workspace:manage / templates:write)

Topbar: Workspace-Name · Rollen-Badge · [Demo-Rollenumschalter] · [+ Neue Freigabe]
```

Nav-Einträge und Aktionen werden serverseitig anhand der Permissions ein-/
ausgeblendet; Direktaufrufe ohne Recht werden umgeleitet (siehe adr-004).

## Rollenbezogene Views (Zielbild)

| Rolle | Sieht / kann |
| --- | --- |
| Owner/Admin | Alles: Übersicht, alle Fälle, Einstellungen, Team, (später) API-Keys |
| Service Advisor | Übersicht, Fälle erstellen/senden/ansehen, Kundenlinks |
| Technician | Eingeschränkt: Zuarbeit/Lesen (volle Erfassung mit Voice, Block 6) |

> Block 2: die Rolle wird über den Dev-Auth-Stub gesetzt; echte
> rollenbasierte Sichtbarkeit kommt mit der Auth in Block 5.

## Customer Approval Flow (extern, loginlos)

```
Link (SMS/E-Mail)  ->  /a/{token}
   │
   ├─ Ungültig/abgelaufen  ->  klare, freundliche Fehlerseite
   └─ Gültig
        ├─ Branded Header (Garage)
        ├─ Anliegen in einfacher Sprache
        ├─ Positionen mit Preisband
        ├─ Gesamt-Preisband + Hinweis „Richtpreis"
        └─ Aktionen:
             ├─ Freigeben     -> Erfolgsseite „freigegeben"
             ├─ Rückruf        -> (opt. Telefon) -> Erfolgsseite „Rückruf"
             └─ Ablehnen       -> (opt. Grund)   -> Erfolgsseite „erhalten"
```

Die Kundenseite zeigt **ausschliesslich kundenrelevante** Informationen — keine
internen Notizen, keinen Audit-Trail, keine anderen Fälle.
