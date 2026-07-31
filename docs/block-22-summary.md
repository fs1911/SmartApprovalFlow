# Block 22 — Summary (Voice-Ausbau: Mehr-Positionen-UI & STT-Anbindung)

Baut auf Block 21 auf, ohne Kernflows umzubauen. Zwei Ziele: das „Neue Freigabe"-
Formular nutzt jetzt eine **dynamische Positionsliste** (der Voice-Draft füllt
alle erkannten Positionen), und der `whisper`-Provider ist von einem Platzhalter
zu einem echten, aber **deaktivierten** STT-Adapter ausgebaut.

## 1. Was gebaut wurde

### Mehr-Positionen-UI
- `apps/web/app/(app)/approvals/new/_items-editor.tsx` (neu): dynamische Liste,
  je Position `items[i].title` + `items[i].priceMin/Max`, Hinzufügen/Entfernen,
  erste Position Pflicht, per-Zeile Feldfehler.
- `form.tsx`: Positions-State ins Formular gehoben; VoicePanel übergibt den Draft
  per `onDraft` → `subject/issueSummary/urgency` imperativ + **alle** Positionen
  in die Liste. Die einzelne „Empfohlene Arbeit"+Preis-Sektion ist ersetzt.
- `actions.ts`: `parseItems(formData)` liest die dynamischen `items[i].*`-Zeilen
  (leere Zeilen werden übersprungen) und schickt sie als `items[]` an
  `POST /approval-cases` (bereits multi-item-fähig — kein Backend-Umbau).
- `_voice-panel.tsx`: nimmt `onDraft`-Prop, meldet die Positionsanzahl.

### STT-Adapter (echt, aber deaktiviert)
- `apps/api/src/lib/voice.ts`: `WhisperProvider` (exportiert) — HTTP-Multipart
  gegen ein OpenAI-kompatibles `/audio/transcriptions`-API (`VOICE_PROVIDER_URL`
  / `VOICE_PROVIDER_MODEL`, `Authorization: Bearer`), Fehlerbehandlung, klarer
  Fehler ohne Audio. Wird **nur** konstruiert, wenn `VOICE_PROVIDER=whisper` +
  Key gesetzt — lokal/CI läuft immer `mock`. `TODO PROVIDER SETUP`.
- `config.ts`: `VOICE_PROVIDER_URL` (Default OpenAI) + `VOICE_PROVIDER_MODEL`
  (Default `whisper-1`).

### Tests
- Unit: `WhisperProvider` weist Requests ohne Audio ab (ohne Netzwerk-Call) +
  bestehende Provider-Auswahl-Tests. Integration: `test/multi-item.test.ts` —
  Fall mit 3 Positionen legt alle an und liest sie zurück.
- Gesamt: Typecheck (alle Workspaces) + Web-Build grün; volle API-Suite grün.

### Doku
- `docs/voice-and-capture.md` erweitert (Mehr-Positionen, whisper-Adapter),
  dieses Summary; `.env.example` (Root + api), Roadmap + README.

## 2. Entscheidungen

- **Backend unverändert**: `createApprovalCaseSchema`/Route konnten schon
  `items[]`; nur das Formular + die Action wurden erweitert.
- **Positions-State im Formular**, uncontrolled bleibt der Rest — minimaler
  Eingriff; VoicePanel füllt Positionen über Callback statt per DOM-`id`.
- **whisper echt, aber deaktiviert**: sauber gekapselter Adapter statt `throw`;
  Aktivierung nur mit Key. Keine echten Calls in Tests (Fehlerpfad unit-getestet).

## 3. Was Mock/Placeholder blieb

- `whisper` ist nicht gegen ein Live-Backend verifiziert (kein Key lokal/CI).
- Keine Kategorie/Beschreibung pro Position im Formular (Default `REPAIR`).
- Keine Audio-Wiedergabe-UI.

## 4. Später nötige Credentials/Accounts

- Für echtes STT: `VOICE_PROVIDER_API_KEY` (+ ggf. `VOICE_PROVIDER_URL/MODEL`),
  einmal gegen das Backend verifizieren.

## 5. Risiken

- Der `whisper`-Adapter ist ungetestet gegen ein echtes API — vor Produktiv-
  nutzung verifizieren; der Mock-Fallback schützt lokal/CI.
- Preis-Eingaben pro Position werden client- und serverseitig zu Minor-Units
  konvertiert; ungültige Eingaben werden von `createApprovalCaseSchema` abgelehnt.

## 6. Nächster Block

Kandidaten: **whisper gegen ein echtes Backend verifizieren** (sobald ein Key
vorliegt), **Kategorie/Beschreibung pro Position** im Formular, oder der
**MVP-Release-Abschluss** (schlankes Runtime-Image + Registry-Push aus Block 20).
Vorschlag + Prompt im Handoff.
