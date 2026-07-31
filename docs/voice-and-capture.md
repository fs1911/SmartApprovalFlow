# Voice-Erfassung (Block 21)

Der zurückgestellte Voice-Layer: die Werkstatt **diktiert** die empfohlene
Zusatzarbeit, wir **transkribieren** sie und leiten daraus einen **Entwurf** ab,
der das Fall-Formular vorbefüllt. Bewusst eine **Erweiterung** der Fallerstellung
— kein neuer Flow: der Entwurf ist nur ein Vorschlag, die normale
`createApprovalCaseSchema`-Validierung greift beim Speichern unverändert.

Läuft vollständig **lokal ohne externen Account** über den `mock`-Provider.

## Ablauf

```
Diktat (Mikrofon oder Text)
        │
        ▼
POST /api/v1/voice/transcribe   (Recht: cases:create)
        │  1) Transkription  (Provider: mock | whisper)
        │  2) parseVoiceDraft(transcript)  → { subject, description, urgency, items[] }
        │  3) Audio optional im Storage-Driver ablegen (best effort)
        │  4) VoiceCapture persistieren (auditierbar)
        ▼
Antwort: { id, transcript, language, provider, draft }
        │
        ▼
Web: Felder im „Neue Freigabe"-Formular vorbefüllt → Nutzer prüft & speichert
```

## Transkriptions-Provider (Adapter)

Wie die übrigen Provider-Adapter (`apps/api/src/lib/voice.ts`):

| Provider | Verhalten | Credentials |
| --- | --- | --- |
| `mock` (Default) | nutzt den mitgelieferten Transkript-Text; ohne Text einen deterministischen Beispielsatz | keine |
| `whisper` | echter STT-Adapter gegen ein OpenAI-kompatibles `/audio/transcriptions`-API | `VOICE_PROVIDER_API_KEY` (TODO PROVIDER SETUP) |

`resolveVoiceProviderName` (rein, unit-getestet) wählt den effektiven Provider;
`whisper` ohne Key degradiert sicher auf `mock` (mit Warnung). In Production
verlangt der Launch-Guard bei `VOICE_PROVIDER=whisper` den Key.

**`whisper`-Adapter (Block 22):** `WhisperProvider` ist ein echtes, aber
**deaktiviertes** HTTP-Gerüst — es wird nur konstruiert, wenn
`VOICE_PROVIDER=whisper` **und** ein Key gesetzt sind; lokal/CI läuft daher
immer `mock` und dieser Pfad wird nie betreten. Es lädt das Audio als Multipart
(`model` + `file`) an `VOICE_PROVIDER_URL` (Default OpenAI, überschreibbar),
`Authorization: Bearer <key>`, und mappt `{ text, language }`. Ohne Audio wirft
er einen klaren Fehler (unit-getestet, ohne Netzwerk-Call). Vor Produktivnutzung
gegen das gewählte Backend verifizieren (`TODO PROVIDER SETUP`).

## Draft-Parser (reine Funktion, das Herzstück)

`apps/api/src/lib/voice-draft.ts` → `parseVoiceDraft(transcript)`. Deterministisch,
unit-getestet, für deutsche Werkstatt-Diktate. Heuristiken (kein LLM):

- **Preise**: Einzelbetrag (`120 CHF`, `Fr. 89`, `120.-`) und Bereiche
  (`zwischen 180 und 240 Franken`, `180 bis 240`); Zahl zählt nur mit Währungs-
  token oder Preis-Cue (`kostet`, `ca.`) als Preis — `2 Schrauben` wird nicht
  fehlinterpretiert. Schweizer Tausender (`1'200`) und Dezimalkomma werden
  normalisiert, Ausgabe in Minor-Units.
- **Dringlichkeit**: `dringend|sofort|sicherheitsrelevant|…` → HIGH;
  `kann warten|unkritisch|…` → LOW; sonst MEDIUM.
- **Positionen**: Transkript wird an Satzgrenzen und `außerdem/zudem/…` geteilt;
  jede Aufgabe wird zu einem Titel (Füllwörter/Preis-Phrase entfernt). Reine
  Dringlichkeits-Bemerkungen („Das ist sicherheitsrelevant") werden **nicht** zu
  Positionen.
- **Betreff**: Titel der ersten Position (sonst erster Satz).
- **Beschreibung**: das Transkript (als „festgestelltes Problem").

Advisory: schlägt der Parser fehl oder findet nichts, bleiben Felder leer und
der Nutzer tippt normal.

## Web

`apps/web/app/(app)/approvals/new/_voice-panel.tsx` — optionales, einklappbares
Panel „🎤 Per Sprache erfassen" über dem Formular:

- **Aufnahme** via `MediaRecorder` (nur wenn vom Browser unterstützt) → Audio
  (base64) an die API. Mit `mock` kommt der Beispiel-Transkript zurück; mit einem
  echten Provider die tatsächliche Transkription.
- **Text-Eingabe**: Diktat eintippen/einfügen und „Entwurf ins Formular
  übernehmen" — funktioniert lokal ohne Mikrofon/Account.
- Vorbefüllung: `subject`, `issueSummary` (Beschreibung) und `urgency` werden
  imperativ per `id` gesetzt; die **Positionen** übergibt das Panel per
  `onDraft(draft)` an das Formular, das eine **dynamische Positionsliste**
  (`ItemsEditor`, Block 22) rendert — **alle** erkannten Positionen werden
  vorbefüllt und sind einzeln editierbar (hinzufügen/entfernen).

## Mehr-Positionen-Formular (Block 22)

Das „Neue Freigabe"-Formular trägt eine dynamische Positionsliste statt einer
einzelnen Arbeit: `_items-editor.tsx` rendert je Position `items[i].title` +
`items[i].priceMin/Max`, mit „+ Position hinzufügen" / „entfernen". Die
Server-Action liest die Zeilen dynamisch (`parseItems`) und schickt sie als
`items[]` an `POST /approval-cases` (bereits multi-item-fähig). Ein
Integrationstest (`test/multi-item.test.ts`) sichert den Backend-Pfad ab.

## Daten & Sicherheit

- `VoiceCapture` (neues Modell): `tenantId`, `createdById?`, `transcript`,
  `provider`, `language?`, `durationSec?`, `audioStorageKey?`. Tenant-scoped,
  Cascade-Delete am Tenant (DSGVO-Löschung aus Block 15 erfasst es mit).
- Audio-Aufbewahrung ist **best effort** und nicht fatal: schlägt der Storage-
  Put fehl, wird nur geloggt, die Antwort steht trotzdem.
- Recht: `cases:create` (Voice ist Teil der Fallerstellung → OWNER/ADMIN/
  SERVICE_ADVISOR). Technician/Viewer erhalten 403.

## ENV

```bash
VOICE_PROVIDER=mock            # mock (Default) | whisper
# TODO PROVIDER SETUP — VOICE_PROVIDER_API_KEY=...   (nötig für whisper)
```

## Bewusst offen (später)

- `whisper` ist als echter Adapter implementiert, aber **deaktiviert** (kein Key
  lokal/CI) und ungegen ein Live-Backend verifiziert — vor Produktivnutzung
  testen.
- Keine Audio-Wiedergabe/-Verwaltung in der UI; das Audio wird nur optional
  abgelegt.
- Keine Kategorie-/Beschreibung-pro-Position im Formular (Default `REPAIR`);
  das Datenmodell unterstützt beides bereits.
