'use client';

import { useState } from 'react';
import { respond, respondItems, type RespondResult } from './actions';

type Mode = 'idle' | 'decline' | 'callback' | 'items';
type ItemChoice = 'APPROVE' | 'DECLINE';

interface ItemOption {
  id: string;
  title: string;
  priceLabel: string;
}

/** Customer-facing decision controls with a clear post-submission state. */
export function ActionsPanel({
  token,
  initialStatus,
  items = [],
}: {
  token: string;
  initialStatus: string;
  items?: ItemOption[];
}) {
  const decided = ['APPROVED', 'PARTIALLY_APPROVED', 'DECLINED', 'CALLBACK'].includes(initialStatus);
  const [result, setResult] = useState<RespondResult | null>(
    decided ? { ok: true, status: initialStatus } : null,
  );
  const [mode, setMode] = useState<Mode>('idle');
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<null | string>(null);
  // Per-item choices, default every position to APPROVE.
  const [choices, setChoices] = useState<Record<string, ItemChoice>>(
    Object.fromEntries(items.map((it) => [it.id, 'APPROVE' as ItemChoice])),
  );

  async function submit(decision: 'APPROVE' | 'DECLINE' | 'CALLBACK') {
    setBusy(decision);
    const res = await respond(token, decision, note, phone);
    setBusy(null);
    setResult(res);
  }

  async function submitItems() {
    setBusy('items');
    const res = await respondItems(
      token,
      items.map((it) => ({ itemId: it.id, decision: choices[it.id] ?? 'APPROVE' })),
      note,
    );
    setBusy(null);
    setResult(res);
  }

  if (result?.ok && result.status) {
    return <SuccessState status={result.status} />;
  }

  const canDecideIndividually = items.length > 1;

  return (
    <div className="stack">
      {result && !result.ok && (
        <div className="alert alert--danger" role="alert">
          {result.error}
        </div>
      )}

      {mode === 'idle' && (
        <div className="public-actions">
          <button
            className="btn btn--success btn--lg"
            disabled={busy !== null}
            aria-busy={busy === 'APPROVE'}
            onClick={() => submit('APPROVE')}
          >
            {busy === 'APPROVE' ? 'Wird gesendet…' : '✓ Alle Arbeiten freigeben'}
          </button>
          {canDecideIndividually && (
            <button className="btn btn--secondary btn--lg" onClick={() => setMode('items')}>
              Einzeln entscheiden
            </button>
          )}
          <button className="btn btn--secondary btn--lg" onClick={() => setMode('callback')}>
            📞 Rückruf wünschen
          </button>
          <button className="btn btn--ghost" onClick={() => setMode('decline')}>
            Alles ablehnen
          </button>
        </div>
      )}

      {mode === 'items' && (
        <div className="stack">
          <p className="subtle" style={{ margin: 0 }}>
            Entscheiden Sie für jede Position einzeln:
          </p>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{it.title}</div>
                <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                  {it.priceLabel}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }} role="group" aria-label={`Entscheid für ${it.title}`}>
                <button
                  type="button"
                  aria-label={`${it.title} freigeben`}
                  aria-pressed={choices[it.id] === 'APPROVE'}
                  className={`btn ${choices[it.id] === 'APPROVE' ? 'btn--success' : 'btn--ghost'}`}
                  onClick={() => setChoices((c) => ({ ...c, [it.id]: 'APPROVE' }))}
                >
                  ✓
                </button>
                <button
                  type="button"
                  aria-label={`${it.title} ablehnen`}
                  aria-pressed={choices[it.id] === 'DECLINE'}
                  className={`btn ${choices[it.id] === 'DECLINE' ? 'btn--danger' : 'btn--ghost'}`}
                  onClick={() => setChoices((c) => ({ ...c, [it.id]: 'DECLINE' }))}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            className="btn btn--primary btn--lg"
            disabled={busy !== null}
            aria-busy={busy === 'items'}
            onClick={() => void submitItems()}
          >
            {busy === 'items' ? 'Wird gesendet…' : 'Auswahl bestätigen'}
          </button>
          <button className="btn btn--ghost" onClick={() => setMode('idle')}>
            Zurück
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
    PARTIALLY_APPROVED: {
      icon: '✓',
      title: 'Vielen Dank — Auswahl erhalten!',
      body: 'Wir haben Ihre Auswahl erhalten und führen die freigegebenen Arbeiten aus. Sie hören von uns.',
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
    <div style={{ textAlign: 'center', padding: '12px 0' }} role="status" aria-live="polite">
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
