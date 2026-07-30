# Block 21 — Summary (Voice-Layer: Sprach-Erfassung der Fallerstellung)

Der bislang zurückgestellte Voice-Layer. Ziel: die Werkstatt diktiert die
Zusatzarbeit, wir transkribieren und leiten einen Entwurf ab, der das
Fall-Formular vorbefüllt — als **Erweiterung** der Fallerstellung, ohne Kernflows
umzubauen. Vollständig lokal ohne externen Account (Mock-Provider).

## 1. Was gebaut wurde

### Transkriptions-Adapter (Provider-Seam)
- `apps/api/src/lib/voice.ts`: `TranscriptionProvider`-Interface, `mock`
  (kein Account) + `whisper`-Platzhalter (TODO PROVIDER SETUP);
  `resolveVoiceProviderName` (rein, unit-getestet) mit sicherem Fallback auf
  `mock`.

### Draft-Parser (reines Herzstück)
- `apps/api/src/lib/voice-draft.ts`: `parseVoiceDraft` + `extractPrice` +
  `detectUrgency`. Deterministische Heuristik für dt. Werkstatt-Diktate: Preise
  (Einzel/Bereich, Schweizer Tausender/Dezimal, Zahl-ist-kein-Preis-Guard),
  Dringlichkeit, Positionen (Filterung von Dringlichkeits-Bemerkungen), Betreff,
  Beschreibung. 10 Unit-Tests.

### API
- `POST /api/v1/voice/transcribe` (`apps/api/src/routes/v1/voice.ts`, Recht
  `cases:create`): transkribiert → parst Draft → legt Audio optional im
  Storage-Driver ab (best effort) → persistiert `VoiceCapture` → liefert
  `{ id, transcript, language, provider, draft }`. Registriert in `index.ts`.
- Schema: neues Modell `VoiceCapture` (+ Migration
  `20260730120000_block21_voice_captures`), Tenant-Cascade.
- Config: `VOICE_PROVIDER` / `VOICE_PROVIDER_API_KEY` + Prod-Launch-Guard.
- Shared: `voiceTranscribeRequestSchema`, `voiceDraftSchema`,
  `voiceTranscribeResultSchema` in `@saf/types`.

### Web
- `_voice-panel.tsx` im „Neue Freigabe"-Formular: optionales Panel „🎤 Per
  Sprache erfassen" mit `MediaRecorder`-Aufnahme **und** Text-Eingabe-Fallback
  (lokal ohne Mikrofon nutzbar). Server-Action `transcribeVoice`. Vorbefüllung
  imperativ per Feld-`id`; Mehrfachpositionen als Hinweis.

### Tests
- Unit: 10 (voice-draft) + 4 (voice-provider). Integration (inject): Draft-Shape,
  422 bei leerem Body, 403 für VIEWER. Alle grün; Gesamt-API-Suite unverändert
  grün.

### Doku
- `docs/voice-and-capture.md`, dieses Summary; `.env.example` (Root + api),
  Roadmap + README.

## 2. Entscheidungen

- **Erweiterung statt Umbau**: der Draft ist advisory, das Formular bleibt wie es
  ist; Vorbefüllung imperativ, weil die Felder uncontrolled sind.
- **Heuristik statt LLM**: deterministisch, testbar, offline, ohne Provider-
  Kosten — passt zum „lokal ohne Account"-Prinzip. Ein echter STT/LLM-Provider
  ist der `whisper`-Seam.
- **`cases:create` als Recht**: Voice ist Teil der Fallerstellung; keine
  RBAC-Änderung. (Ob Technician diktieren darf, ist eine spätere RBAC-Frage.)
- **Audio-Aufbewahrung best effort**: Storage-Fehler dürfen die Transkription
  nicht scheitern lassen.

## 3. Was Mock/Placeholder blieb

- `whisper`-Provider ist ein Platzhalter (`throw`), echte STT-Anbindung später.
- Audio wird nur optional abgelegt; keine Wiedergabe-UI.
- Formular trägt eine Hauptposition (Parser liefert bereits mehrere).

## 4. Später nötige Credentials/Accounts

- Nur für echtes STT: `VOICE_PROVIDER_API_KEY` (+ Implementierung des
  `whisper`-Providers).

## 5. Risiken

- Der Heuristik-Parser ist bewusst simpel — er trifft nicht jedes Diktat perfekt;
  deshalb advisory + Nutzer-Review. Unit-Tests decken die Kernfälle ab.
- Mit `mock` + Audioaufnahme kommt der Beispiel-Transkript zurück (nicht das
  Gesagte) — dokumentiert; der ehrliche lokale Pfad ist die Text-Eingabe.

## 6. Nächster Block

Kandidaten: **echte STT-Anbindung** (`whisper`-Provider implementieren),
**Mehr-Positionen-UI** im Fall-Formular, oder **MVP-Abschluss/Release**
(schlankes Image + Registry-Push aus Block 20). Vorschlag + Prompt im Handoff.
