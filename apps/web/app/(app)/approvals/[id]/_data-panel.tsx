'use client';

import { useState } from 'react';
import { eraseCase } from './actions';

/** GDPR data controls for a case: export + irreversible erasure (Block 15). */
export function DataPanel({ caseId }: { caseId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onErase() {
    setBusy(true);
    setError(null);
    const res = await eraseCase(caseId);
    // On success the action redirects; only errors return here.
    if (res && !res.ok) {
      setError(res.error ?? 'Löschen fehlgeschlagen.');
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <a className="btn btn--secondary btn--block" href={`/approvals/${caseId}/export`}>
        ⬇ Daten exportieren (JSON)
      </a>

      {!confirming ? (
        <button className="btn btn--ghost btn--block" onClick={() => setConfirming(true)}>
          Fall löschen…
        </button>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
          <div className="alert alert--danger" role="alert">
            Unwiderruflich: der Fall und alle zugehörigen Daten (Positionen, Fotos, Entscheide,
            Notizen) werden gelöscht.
          </div>
          <button className="btn btn--danger btn--block" disabled={busy} aria-busy={busy} onClick={() => void onErase()}>
            {busy ? 'Wird gelöscht…' : 'Endgültig löschen'}
          </button>
          <button className="btn btn--ghost btn--block" disabled={busy} onClick={() => setConfirming(false)}>
            Abbrechen
          </button>
        </div>
      )}
      {error && <div className="alert alert--danger" role="alert">{error}</div>}
    </div>
  );
}
