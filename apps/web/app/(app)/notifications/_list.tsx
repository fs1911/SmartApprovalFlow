'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markRead, markAllRead } from './actions';

export interface NotificationRow {
  id: string;
  type: string;
  label: string;
  approvalCaseId: string | null;
  data: { reference?: string; subject?: string } | null;
  readAt: string | null;
  createdAt: string;
}

function fmt(d: string) {
  return new Date(d).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const hasUnread = items.some((n) => !n.readAt);

  async function onRead(id: string) {
    await markRead(id);
    router.refresh();
  }
  async function onReadAll() {
    await markAllRead();
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="card__body" style={{ textAlign: 'center', padding: '32px 0' }}>
          <div className="empty__icon" aria-hidden>🔔</div>
          <p className="subtle">Keine Benachrichtigungen. Sie sind auf dem Laufenden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn--secondary" disabled={!hasUnread} onClick={() => void onReadAll()}>
          Alle als gelesen markieren
        </button>
      </div>
      <div className="card">
        <div className="card__body stack" style={{ gap: 0 }}>
          {items.map((n) => {
            const inner = (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {!n.readAt && (
                    <span
                      aria-label="ungelesen"
                      style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--color-brand-500)', marginTop: 6, flex: '0 0 8px' }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: n.readAt ? 400 : 600 }}>{n.label}</div>
                    <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                      {n.data?.reference ? `${n.data.reference} · ` : ''}
                      {n.data?.subject ?? ''} · {fmt(n.createdAt)}
                    </div>
                  </div>
                </div>
                {!n.readAt && (
                  <button
                    className="btn btn--ghost"
                    style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                    onClick={(e) => {
                      e.preventDefault();
                      void onRead(n.id);
                    }}
                  >
                    gelesen
                  </button>
                )}
              </div>
            );
            return n.approvalCaseId ? (
              <Link
                key={n.id}
                href={`/approvals/${n.approvalCaseId}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => {
                  if (!n.readAt) void markRead(n.id);
                }}
              >
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
