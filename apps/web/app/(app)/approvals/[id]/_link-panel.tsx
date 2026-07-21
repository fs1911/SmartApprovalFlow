'use client';

import { useState } from 'react';
import { generatePublicLink, type LinkState } from './actions';

/**
 * The raw token is only returned once at generation time (only its hash is
 * stored), so we surface it here and let the advisor copy it. On reload the
 * advisor can rotate a fresh link.
 */
export function LinkPanel({ caseId, hasLink }: { caseId: string; hasLink: boolean }) {
  const [state, setState] = useState<LinkState>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onGenerate() {
    setBusy(true);
    setCopied(false);
    const res = await generatePublicLink(caseId);
    setState(res);
    setBusy(false);
  }

  async function onCopy() {
    if (!state.url) return;
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can still select the text */
    }
  }

  return (
    <div className="stack">
      {state.error && <div className="alert alert--danger">{state.error}</div>}

      {state.url ? (
        <>
          <div className="alert alert--success">
            Sicherer Kundenlink erzeugt. Diesen jetzt kopieren — er wird aus Sicherheitsgründen
            nicht erneut angezeigt.
          </div>
          <div className="linkbox">
            <input readOnly value={state.url} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn btn--secondary" onClick={onCopy} type="button">
              {copied ? 'Kopiert ✓' : 'Kopieren'}
            </button>
          </div>
          {state.expiresAt && (
            <p className="subtle">
              Gültig bis {new Date(state.expiresAt).toLocaleDateString('de-CH')}.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="subtle">
            {hasLink
              ? 'Für diesen Fall besteht bereits ein Link. Sie können einen neuen erzeugen (der alte wird ungültig).'
              : 'Erzeugen Sie einen sicheren Link, den der Kunde ohne Login öffnen kann.'}
          </p>
          <button className="btn btn--primary" onClick={onGenerate} disabled={busy} type="button">
            {busy ? 'Wird erzeugt…' : hasLink ? 'Neuen Link erzeugen' : 'Kundenlink erzeugen'}
          </button>
        </>
      )}
    </div>
  );
}
