'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignCase, addNote } from './actions';
import { formatDateTime } from '@/lib/format';

export interface Member {
  id: string;
  name: string;
}
export interface Note {
  id: string;
  body: string;
  author: { id: string; name: string } | null;
  createdAt: string;
}

export function CollabPanel({
  caseId,
  assigneeId,
  members,
  notes,
  canManage,
}: {
  caseId: string;
  assigneeId: string | null;
  members: Member[];
  notes: Note[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [assignee, setAssignee] = useState(assigneeId ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAssign(value: string) {
    setAssignee(value);
    setBusy(true);
    setError(null);
    const res = await assignCase(caseId, value || null);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Fehler');
    else router.refresh();
  }

  async function onAddNote() {
    setBusy(true);
    setError(null);
    const res = await addNote(caseId, note);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? 'Fehler');
    setNote('');
    router.refresh();
  }

  return (
    <div className="stack">
      {canManage && (
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="assignee">Zugewiesen an</label>
          <select id="assignee" value={assignee} disabled={busy} onChange={(e) => void onAssign(e.target.value)}>
            <option value="">— niemand —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: 'var(--text-sm)', margin: '4px 0 8px' }}>Interne Notizen</h3>
        <p className="subtle" style={{ fontSize: 'var(--text-xs)', marginTop: -4 }}>
          Nur intern sichtbar — nie auf der Kundenseite.
        </p>
        {notes.length > 0 ? (
          <div className="stack" style={{ gap: 6, marginBottom: 10 }}>
            {notes.map((n) => (
              <div key={n.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>
                <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                  {n.author?.name ?? 'System'} · {formatDateTime(n.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="subtle" style={{ fontSize: 'var(--text-xs)' }}>Noch keine Notizen.</p>
        )}

        <div className="field" style={{ margin: 0 }}>
          <textarea
            id="note-body"
            aria-label="Neue interne Notiz"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Interne Notiz hinzufügen…"
            rows={2}
          />
        </div>
        <button
          className="btn btn--secondary"
          style={{ marginTop: 6 }}
          disabled={busy || !note.trim()}
          aria-busy={busy}
          onClick={() => void onAddNote()}
        >
          Notiz speichern
        </button>
      </div>

      {error && <div className="alert alert--danger" role="alert">{error}</div>}
    </div>
  );
}
