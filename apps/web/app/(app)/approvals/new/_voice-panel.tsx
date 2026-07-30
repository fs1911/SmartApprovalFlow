'use client';

import { useRef, useState } from 'react';
import { transcribeVoice } from './actions';

/**
 * Optional voice capture for case creation (Block 21). The mechanic dictates
 * the extra work; we transcribe it and pre-fill the form below. Two paths:
 *  - Record via the microphone (uses the configured transcription provider).
 *  - Type/paste a dictation (works with the local mock provider, no account).
 *
 * Pre-filling is imperative (the form fields are uncontrolled), so this panel
 * just writes values into them by id — the user reviews and edits as normal.
 */

function setField(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = value;
}

function minorToChf(minor: number): string {
  return (minor / 100).toFixed(2);
}

const canRecord =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== 'undefined';

/** Convert audio bytes to base64 without blowing the call stack on big buffers. */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function VoicePanel() {
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [busy, setBusy] = useState<null | 'record' | 'draft'>(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraItems, setExtraItems] = useState<string[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  function applyDraft(draft: NonNullable<Awaited<ReturnType<typeof transcribeVoice>>['draft']>) {
    setField('subject', draft.subject ?? '');
    if (draft.description) setField('issueSummary', draft.description);
    setField('urgency', draft.urgency);
    const [first, ...rest] = draft.items;
    if (first) {
      setField('recommendationSummary', first.title);
      if (first.priceBand) {
        setField('priceMin', minorToChf(first.priceBand.minMinor));
        setField('priceMax', minorToChf(first.priceBand.maxMinor));
      }
    }
    setExtraItems(rest.map((it) => it.title));
    setStatus('Formular ausgefüllt — bitte prüfen und ergänzen.');
  }

  async function sendTranscript() {
    setBusy('draft');
    setError(null);
    setStatus(null);
    const res = await transcribeVoice({ mockTranscript: transcript });
    setBusy(null);
    if (!res.ok) return setError(res.error ?? 'Transkription fehlgeschlagen.');
    if (res.transcript) setTranscript(res.transcript);
    if (res.draft) applyDraft(res.draft);
  }

  async function startRecording() {
    setError(null);
    setStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
        setBusy('record');
        try {
          const audioBase64 = toBase64(await blob.arrayBuffer());
          const res = await transcribeVoice({ audioBase64, contentType: blob.type, durationSec });
          if (!res.ok) setError(res.error ?? 'Transkription fehlgeschlagen.');
          else {
            if (res.transcript) setTranscript(res.transcript);
            if (res.draft) applyDraft(res.draft);
          }
        } finally {
          setBusy(null);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError('Mikrofon nicht verfügbar. Bitte den Text unten eingeben.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card__body">
        <button
          type="button"
          className="btn btn--ghost"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{ padding: 0 }}
        >
          🎤 Per Sprache erfassen {open ? '▾' : '▸'}
        </button>

        {open && (
          <div className="stack" style={{ marginTop: 12 }}>
            <p className="hint" style={{ margin: 0 }}>
              Diktieren Sie die empfohlene Arbeit. Wir füllen das Formular vor — Sie prüfen und
              ergänzen. Ohne Mikrofon: Text unten eintippen.
            </p>

            {canRecord && (
              <div className="row" style={{ gap: 8 }}>
                {!recording ? (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={busy !== null}
                    aria-busy={busy === 'record'}
                    onClick={() => void startRecording()}
                  >
                    {busy === 'record' ? 'Wird verarbeitet…' : '● Aufnahme starten'}
                  </button>
                ) : (
                  <button type="button" className="btn btn--danger" onClick={stopRecording}>
                    ■ Aufnahme stoppen
                  </button>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="voiceTranscript">Diktat / Notiz</label>
              <textarea
                id="voiceTranscript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
                placeholder="z. B. Bremsbeläge vorne ersetzen, kostet zwischen 180 und 240 Franken. Außerdem Ölwechsel für 120 CHF. Dringend."
              />
            </div>

            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy !== null || transcript.trim().length === 0}
                aria-busy={busy === 'draft'}
                onClick={() => void sendTranscript()}
              >
                {busy === 'draft' ? 'Wird übernommen…' : 'Entwurf ins Formular übernehmen'}
              </button>
            </div>

            {status && (
              <div className="alert alert--success" role="status">
                {status}
              </div>
            )}
            {extraItems.length > 0 && (
              <p className="hint" style={{ margin: 0 }}>
                Weitere erkannte Positionen (bitte manuell ergänzen): {extraItems.join(' · ')}
              </p>
            )}
            {error && (
              <div className="alert alert--danger" role="alert">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
