# Offene Entscheidungen

Format je Entscheidung: kurze Frage · warum wichtig · Optionen · Empfehlung.
Diese Punkte blockieren den Build **nicht** — sie sind mit professionellen
Defaults vorbelegt und hier zur bewussten Bestätigung gesammelt.

## E1 — SMS-Versand im MVP?

**Warum wichtig:** SMS erhöht die Öffnungsrate der Kundenlinks deutlich, kostet
aber Provider-Anbindung und Gebühren.

- **Option A:** E-Mail-only im MVP, Link zusätzlich manuell teilbar (Copy-Link).
- **Option B:** E-Mail + SMS direkt (z. B. Twilio/MessageBird).
- **Option C:** Nur Copy-Link (Garage versendet selbst), Automatik später.

**Empfehlung:** **A** jetzt (Struktur für SMS ist im Modell vorbereitet),
**B** in Block 4. In Block 2 ist der Versand ohnehin noch manuell (Copy-Link).

## E2 — Mehrere Positionen einzeln freigebbar?

**Warum wichtig:** Kunden wollen evtl. nur einen Teil freigeben.

- **Option A:** Ganzer Fall wird als Ganzes entschieden (MVP).
- **Option B:** Pro Position freigeben/ablehnen.

**Empfehlung:** **A** jetzt (einfach, klar), **B** in Block 3 — das Datenmodell
(`ApprovalItem`) ist dafür schon ausgelegt.

## E3 — Foto-Upload jetzt produktiv?

**Warum wichtig:** Fotos sind zentral fürs Vertrauen.

- **Option A:** Datenmodell + Pfad vorbereitet, Upload-UI in Block 3.
- **Option B:** Sofort produktiver Upload (Storage-Provider nötig).

**Empfehlung:** **A** — `Attachment` ist modelliert; produktiver Upload inkl.
Storage-Treiber in Block 3, damit die Kundenseite nicht überladen wird.

## E4 — Auth-Reihenfolge

**Warum wichtig:** Ohne echte Auth ist kein Produktivbetrieb möglich.

- **Option A:** Dev-Stub in Block 2, echte Auth gebündelt in Block 5.
- **Option B:** Echte Auth früher (verlangsamt den Workflow-Fokus).

**Empfehlung:** **A** — Workflow-Wert zuerst zeigen; Auth als eigener,
sauberer Block (nur `auth-context.ts` wird getauscht).
