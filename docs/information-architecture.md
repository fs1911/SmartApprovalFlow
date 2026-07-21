# Information Architecture

## App-Navigation (intern)

```
Sidebar
├── Übersicht        /dashboard      Kennzahlen + neueste Fälle
├── Freigaben        /approvals      Liste aller Fälle
│   ├── Neu          /approvals/new  Fall erstellen
│   └── Detail       /approvals/:id  Fall + Audit + Kundenlink
└── Einstellungen    /settings       Vorlagen, Team (Ausbau später)

Topbar: Workspace-Name · Rolle · [+ Neue Freigabe]
```

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
