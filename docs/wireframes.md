# Wireframes (Low-Fidelity, textuell)

## Login / Workspace-Auswahl *(vorbereitet, Auth in Block 5)*

```
┌───────────────────────────────┐
│           [S] Smart Approval   │
│                                │
│   Anmelden                     │
│   ┌──────────────────────────┐ │
│   │ E-Mail                   │ │
│   └──────────────────────────┘ │
│   ┌──────────────────────────┐ │
│   │ Passwort                 │ │
│   └──────────────────────────┘ │
│   [ Anmelden ]                 │
│                                │
│   Workspace: ( Muster Garage ▾)│
└───────────────────────────────┘
```

## Dashboard `/dashboard`

```
Sidebar │ Topbar: Muster Garage · Service Advisor · [+ Neue Freigabe]
────────┼──────────────────────────────────────────────────────────
        │ Übersicht
        │ [Wartet 3] [Freigegeben 5] [Abgelehnt 1] [Rückruf 0]
        │
        │ Neueste Freigaben              Alle ansehen →
        │ ┌──────────────────────────────────────────┐
        │ │ Bremsen hinten   AC-2026-0001 · P. Beisp. │ [Dringend][Gesendet]
        │ │ Ölservice        AC-2026-0002 · M. Muster │ [Mittel][Freigegeben]
        │ └──────────────────────────────────────────┘
```

## Approval-Fall erstellen `/approvals/new`

```
Neue Freigabe erstellen
┌─ Anliegen ──────────────────────────────────┐
│ Betreff*        [___________________________]│
│ Problem         [ textarea ]                 │
│ Empfohlene Arbeit* [________________________]│
│ Preis von [___]   Preis bis [___]  (CHF)     │
│ Dringlichkeit ( Mittel ▾ )                   │
└─────────────────────────────────────────────┘
┌─ Kunde & Fahrzeug ──────────────────────────┐
│ Name*  [______]  E-Mail [____] Telefon [____]│
│ Kennz. [______]  Marke  [____] Modell  [____]│
└─────────────────────────────────────────────┘
[x] Sofort senden (erzeugt Kundenlink)
[ Freigabe anlegen ]   [ Abbrechen ]
```

## Fall-Detailseite `/approvals/:id`

```
Freigaben / AC-2026-0001
Bremsen hinten   [Dringend] [Gesendet]

┌ Empfohlene Arbeiten ───────┐   ┌ Kundenlink ─────────────┐
│ Bremsbeläge  CHF 180–240   │   │ [ Kundenlink erzeugen ] │
│ Bremsscheiben CHF 220–300  │   │ .../a/xxxx  [Kopieren]  │
│ Gesamt       CHF 400–540   │   └─────────────────────────┘
└────────────────────────────┘   ┌ Kunde & Fahrzeug ───────┐
┌ Verlauf (Audit Trail) ─────┐   │ Peter Beispiel · VW Golf│
│ ● Fall erstellt   09:12    │   └─────────────────────────┘
│ ● Link erzeugt    09:13    │   ┌ Meta ───────────────────┐
│ ● Kunde öffnete   10:40    │   │ Erstellt · Gesendet     │
└────────────────────────────┘   └─────────────────────────┘
```

## Kundenansicht Freigabelink `/a/{token}` (mobile-first)

```
┌───────────────────────────┐
│ [MG] Muster Garage        │
│      Freigabeanfrage AC-1 │
├───────────────────────────┤
│ Guten Tag Peter           │
│ Bremsen hinten            │
│ Ihr Fahrzeug: VW Golf     │
│                           │
│ Bremsbeläge   CHF 180–240 │
│ Bremsscheiben CHF 220–300 │
│ ───────────────────────── │
│ Voraussichtliche Kosten   │
│      CHF 400 – 540        │
│ (Richtpreis)              │
│                           │
│ [   ✓ Arbeiten freigeben ]│
│ [   📞 Rückruf wünschen   ]│
│ [   Ablehnen             ]│
│                           │
│ 🔒 Sicher · ✓ Kein Login  │
└───────────────────────────┘
   nach Absenden:
┌───────────────────────────┐
│         (✓)               │
│  Vielen Dank — freigegeben│
│  Wir starten die Arbeiten.│
└───────────────────────────┘
```

## Einstellungen / Templates `/settings`

```
Einstellungen
┌ Nachrichtenvorlagen ───────────────────────┐
│ approval_request_email  (Standard)         │
│ „Guten Tag {{customerName}} …"             │
│ [Bearbeiten] (Block 4)                     │
└────────────────────────────────────────────┘
```
