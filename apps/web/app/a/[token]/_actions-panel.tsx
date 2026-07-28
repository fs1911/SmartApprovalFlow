'use client';

import { useState } from 'react';
import { t, type Locale, type Messages } from '@saf/ui';
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
  locale,
  initialStatus,
  items = [],
}: {
  token: string;
  locale: Locale;
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
    return <SuccessState status={result.status} locale={locale} />;
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
            {busy === 'APPROVE' ? t(locale, 'sending') : t(locale, 'approveAll')}
          </button>
          {canDecideIndividually && (
            <button className="btn btn--secondary btn--lg" onClick={() => setMode('items')}>
              {t(locale, 'decideIndividually')}
            </button>
          )}
          <button className="btn btn--secondary btn--lg" onClick={() => setMode('callback')}>
            {t(locale, 'requestCallback')}
          </button>
          <button className="btn btn--ghost" onClick={() => setMode('decline')}>
            {t(locale, 'declineAll')}
          </button>
        </div>
      )}

      {mode === 'items' && (
        <div className="stack">
          <p className="subtle" style={{ margin: 0 }}>
            {t(locale, 'decideEachHint')}
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
              <div
                className="row"
                style={{ gap: 6 }}
                role="group"
                aria-label={`${t(locale, 'approve')} / ${t(locale, 'decline')} — ${it.title}`}
              >
                <button
                  type="button"
                  aria-label={`${it.title}: ${t(locale, 'approve')}`}
                  aria-pressed={choices[it.id] === 'APPROVE'}
                  className={`btn ${choices[it.id] === 'APPROVE' ? 'btn--success' : 'btn--ghost'}`}
                  onClick={() => setChoices((c) => ({ ...c, [it.id]: 'APPROVE' }))}
                >
                  ✓
                </button>
                <button
                  type="button"
                  aria-label={`${it.title}: ${t(locale, 'decline')}`}
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
            {busy === 'items' ? t(locale, 'sending') : t(locale, 'confirmSelection')}
          </button>
          <button className="btn btn--ghost" onClick={() => setMode('idle')}>
            {t(locale, 'back')}
          </button>
        </div>
      )}

      {mode === 'callback' && (
        <div className="stack">
          <div className="field">
            <label htmlFor="phone">{t(locale, 'phoneLabel')}</label>
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
            {busy ? t(locale, 'sending') : t(locale, 'requestCallbackBtn')}
          </button>
          <button className="btn btn--ghost" onClick={() => setMode('idle')}>
            {t(locale, 'back')}
          </button>
        </div>
      )}

      {mode === 'decline' && (
        <div className="stack">
          <div className="field">
            <label htmlFor="note">{t(locale, 'declineReasonLabel')}</label>
            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button
            className="btn btn--danger btn--lg"
            disabled={busy !== null}
            onClick={() => submit('DECLINE')}
          >
            {busy ? t(locale, 'sending') : t(locale, 'declineBtn')}
          </button>
          <button className="btn btn--ghost" onClick={() => setMode('idle')}>
            {t(locale, 'back')}
          </button>
        </div>
      )}
    </div>
  );
}

function SuccessState({ status, locale }: { status: string; locale: Locale }) {
  const map: Record<
    string,
    { icon: string; titleKey: keyof Messages; bodyKey: keyof Messages }
  > = {
    APPROVED: { icon: '✓', titleKey: 'successApprovedTitle', bodyKey: 'successApprovedBody' },
    PARTIALLY_APPROVED: {
      icon: '✓',
      titleKey: 'successPartialTitle',
      bodyKey: 'successPartialBody',
    },
    DECLINED: { icon: '✕', titleKey: 'successDeclinedTitle', bodyKey: 'successDeclinedBody' },
    CALLBACK: { icon: '📞', titleKey: 'successCallbackTitle', bodyKey: 'successCallbackBody' },
  };
  const s = map[status] ?? map.APPROVED!;
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }} role="status" aria-live="polite">
      <div
        aria-hidden="true"
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
      <h2 style={{ marginBottom: 8 }}>{t(locale, s.titleKey)}</h2>
      <p className="subtle">{t(locale, s.bodyKey)}</p>
    </div>
  );
}
