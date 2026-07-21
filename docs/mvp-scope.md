# MVP-Scope

## In scope

- Approval-Fall anlegen (Betreff, Beschreibung, Empfehlung, Preisband,
  Dringlichkeit, Kunde, Fahrzeug).
- Fall speichern, in Liste mit Status anzeigen, Detailseite öffnen.
- Sicheren, loginlosen Kundenlink (Token) erzeugen.
- Öffentliche, mobilfreundliche Kundenseite mit Branding.
- Kundenentscheid: Freigeben / Ablehnen / Rückruf wünschen.
- Statusaktualisierung in Echtzeit für die Garage.
- Revisionssicherer Audit-Trail für alle relevanten Aktionen.
- Foto-Anhänge als Datenmodell + Upload-Pfad vorbereitet.
- Konsistente REST-API mit OpenAPI-Doku.

## Out of scope (bewusst später)

- Voice-Erfassung / Voice-Rapportierung (Block 6).
- E-Mail-/SMS-Versand produktiv (Struktur vorbereitet, Block 4).
- Fakturierung, CRM, Terminplanung.
- DMS-Integrationen (API vorbereitet, Block 5).
- Marktplatz, White-Label-Self-Service.
- Erweiterte Analytics und Reporting.

## MVP User Journeys

### J1 — Interne Freigabe erstellen und senden
Serviceberater → „Neue Freigabe" → Formular ausfüllen → speichern →
Kundenlink erzeugen → per SMS/E-Mail (manuell im MVP) an Kunde.

### J2 — Kunde entscheidet (loginlos)
Kunde öffnet Link → sieht Anliegen, Preis, Dringlichkeit → wählt
Freigeben/Ablehnen/Rückruf → Bestätigungsseite.

### J3 — Garage sieht Ergebnis
Serviceberater sieht Status live in Liste + Detail; Audit-Trail belegt den
Entscheid nachvollziehbar.

## Success Metrics

| Metrik | Zielrichtung |
| --- | --- |
| Time-to-first-approval (Onboarding) | < 1 Tag |
| Zeit vom Senden bis Kundenentscheid | Median < 2 h |
| Freigabequote (approved / gesendet) | > 55 % |
| Anteil dokumentierter Entscheide | 100 % (per Design) |
| Zusatzumsatz pro aktiver Garage / Monat | qualitativer Pilot-KPI |
