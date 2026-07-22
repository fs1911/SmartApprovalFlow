'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteMember, revokeInvite } from './actions';

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ADMIN', label: 'Administrator:in' },
  { value: 'SERVICE_ADVISOR', label: 'Serviceberater:in' },
  { value: 'TECHNICIAN', label: 'Techniker:in' },
  { value: 'VIEWER', label: 'Betrachter:in' },
];

export interface PendingInvite {
  id: string;
  email: string;
  roleLabel: string | null;
  expiresAt: string;
  expired: boolean;
}

export function InvitePanel({ invites }: { invites: PendingInvite[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SERVICE_ADVISOR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setDevLink(null);
    const res = await inviteMember(email.trim(), role);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Einladung fehlgeschlagen.');
      return;
    }
    setEmail('');
    if (res.acceptUrl) setDevLink(res.acceptUrl);
    router.refresh();
  }

  async function onRevoke(id: string) {
    setBusy(true);
    const res = await revokeInvite(id);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Widerruf fehlgeschlagen.');
    else router.refresh();
  }

  return (
    <div className="card">
      <div className="card__body stack">
        <h2>Mitglied einladen</h2>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '1 1 220px', margin: 0 }}>
            <label htmlFor="inv-email">E-Mail</label>
            <input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kolleg@garage.ch"
            />
          </div>
          <div className="field" style={{ flex: '0 1 200px', margin: 0 }}>
            <label htmlFor="inv-role">Rolle</label>
            <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn--primary" disabled={busy} aria-busy={busy} onClick={() => void submit()}>
            {busy ? 'Sendet…' : 'Einladen'}
          </button>
        </div>

        {error && (
          <div className="alert alert--danger" role="alert">
            {error}
          </div>
        )}
        {devLink && (
          <div className="alert alert--info" role="status">
            Einladung erstellt. Dev-Link (lokal, ohne echtes Postfach):{' '}
            <a href={devLink}>{devLink}</a>
          </div>
        )}

        {invites.length > 0 && (
          <div>
            <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: 6 }}>Offene Einladungen</h3>
            <div className="stack" style={{ gap: 6 }}>
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: 6,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{inv.email}</div>
                    <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                      {inv.roleLabel ?? '—'}
                      {inv.expired ? ' · abgelaufen' : ` · gültig bis ${new Date(inv.expiresAt).toLocaleDateString('de-CH')}`}
                    </div>
                  </div>
                  <button className="btn btn--ghost" disabled={busy} onClick={() => void onRevoke(inv.id)}>
                    Widerrufen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
