'use client';

import { useState } from 'react';
import { respond, type RespondResult } from './actions';

type Mode = 'idle' | 'decline' | 'callback';

/** Customer-facing decision controls with a clear post-submission state. */
export function ActionsPanel({
  token,
  initialStatus,
}: {
  token: string;
  initialStatus: string;
}) {
  const decided = ['APPROVED', 'DECLINED', 'CALLBACK'].includes(initialStatus);
  const [result, setResult] = useState<RespondResult | null>(
    decided ? { ok: true, status: initialStatus } : null,
  );
  const [mode, setMode] = useState<Mode>('idle');
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<null | string>(null);

  async function submit(decision: 'APPROVE' | 'DECLINE' | 'CALLBACK') {
    setBusy(decision);
    const res = await respond(token, decision, note, phone);
    setBusy(null);
    setResult(res);
  }

  if (result?.ok && result.status) {
    return <SuccessState status={result.status} />;
  }

  return (
    <div className="stack">
      {result && !result.ok && <div className="alert alert--danger">{result.error}</div>}

      {mode === 'idle' && (
        <div className="public-actions">
          <button
            className="btn btn--success btn--lg"
            disabled={busy !== null}
            onClick={() => submit('APPROVE')}
          >
            {busy === 'APPROVE' ? 'Wird gesendet…' : '✓ Arbeiten freigeben'}
          </button>
          <button className="btn btn--secondary btn--lg" onClick={() => setMode('callback')}>
            📞 Rückruf wünschen
          </button>
          <button className="btn btn--ghost" onClick={() => setMode('decline')}>
            Ablehnen
          </button>
        </div>
      )}

      {mode === 'callback' && (
        <div className="stack">
          <div className="field">
            <label htmlFor="phone">Ihre Telefonnummer (optional)</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+41 79 …"
            />
          </div>
          <button
            className="btn btn--primary btn--lg"
            disabled={busy !== null}
            onClick={() => submit('CALLBACK')}
          >
            {busy ? 'Wird gesendet…' : 'Rückruf anfordern'}
          </button>
          <button className="btn btn--ghost" onClick={() => setMode('idle')}>
            Zurück
          </button>
        </div>
      )}

      {mode === 'decline' && (
        <div className="stack">
          <div className="field">
            <label htmlFor="note">Möchten Sie uns kurz mitteilen, warum? (optional)</label>
            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button
            className="btn btn--danger btn--lg"
            disabled={busy !== null}
            onClick={() => submit('DECLINE')}
          >
            {busy ? 'Wird gesendet…' : 'Arbeiten ablehnen'}
          </button>
          <button className="btn btn--ghost" onClick={() => setMode('idle')}>
            Zurück
          </button>
        </div>
      )}
    </div>
  );
}

function SuccessState({ status }: { status: string }) {
  const map: Record<string, { icon: string; title: string; body: string; cls: string }> = {
    APPROVED: {
      icon: '✓',
      title: 'Vielen Dank — freigegeben!',
      body: 'Wir haben Ihre Freigabe erhalten und starten mit den Arbeiten. Sie hören von uns.',
      cls: 'alert--success',
    },
    DECLINED: {
      icon: '✕',
      title: 'Antwort erhalten',
      body: 'Sie haben die Arbeiten abgelehnt. Ihre Werkstatt wurde informiert.',
      cls: 'alert--info',
    },
    CALLBACK: {
      icon: '📞',
      title: 'Rückruf angefragt',
      body: 'Ihre Werkstatt wird sich in Kürze bei Ihnen melden.',
      cls: 'alert--info',
    },
  };
  const s = map[status] ?? map.APPROVED!;
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div
        style={{
          fontSize: '2.5rem',
          width: 72,
          height: 72,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 16px',
          background: 'var(--color-success-50)',
          color: 'var(--color-success-500)',
        }}
      >
        {s.icon}
      </div>
      <h2 style={{ marginBottom: 8 }}>{s.title}</h2>
      <p className="subtle">{s.body}</p>
    </div>
  );
}
