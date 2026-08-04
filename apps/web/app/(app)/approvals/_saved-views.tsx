'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSavedView, deleteSavedView, setDefaultView, clearDefaultView } from './actions';

export interface SavedViewFilters {
  status?: string;
  category?: string;
  urgency?: string;
  createdWithin?: string;
  createdFrom?: string;
  createdTo?: string;
  assignee?: string;
}

export interface SavedView {
  id: string;
  name: string;
  visibility: 'SHARED' | 'PRIVATE';
  filters: SavedViewFilters;
}

/** Build an /approvals href from a stored filter set. */
function hrefForFilters(filters: SavedViewFilters): string {
  const sp = new URLSearchParams();
  if (filters.assignee) sp.set('assignee', filters.assignee);
  if (filters.category) sp.set('category', filters.category);
  if (filters.urgency) sp.set('urgency', filters.urgency);
  if (filters.createdWithin) sp.set('createdWithin', filters.createdWithin);
  if (filters.createdFrom) sp.set('createdFrom', filters.createdFrom);
  if (filters.createdTo) sp.set('createdTo', filters.createdTo);
  if (filters.status) sp.set('status', filters.status);
  const qs = sp.toString();
  return qs ? `/approvals?${qs}` : '/approvals';
}

/** True when the currently active filters match this saved view exactly. */
function isActiveView(current: SavedViewFilters, view: SavedViewFilters): boolean {
  const keys: (keyof SavedViewFilters)[] = [
    'status',
    'category',
    'urgency',
    'createdWithin',
    'createdFrom',
    'createdTo',
    'assignee',
  ];
  return keys.every((k) => (current[k] ?? '') === (view[k] ?? ''));
}

export function SavedViews({
  views,
  current,
  canManage,
  hasActiveFilters,
  defaultViewId,
}: {
  views: SavedView[];
  current: SavedViewFilters;
  canManage: boolean;
  hasActiveFilters: boolean;
  defaultViewId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        onOk?.();
        router.refresh();
      } else {
        setError(res.error ?? 'Fehler');
      }
    });
  }

  function onSave(formData: FormData) {
    run(
      () => createSavedView(formData),
      () => {
        setName('');
        setShowForm(false);
      },
    );
  }

  return (
    <section
      className="row"
      style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}
      role="group"
      aria-label="Gespeicherte Ansichten"
    >
      <span className="subtle" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
        Ansichten:
      </span>

      {views.length === 0 && (
        <span className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
          Noch keine gespeichert.
        </span>
      )}

      {views.map((view) => {
        const active = isActiveView(current, view.filters);
        const isDefault = view.id === defaultViewId;
        return (
          <span key={view.id} className="row" style={{ gap: 2, alignItems: 'center' }}>
            <Link
              href={hrefForFilters(view.filters)}
              className={`btn ${active ? 'btn--primary' : 'btn--ghost'}`}
              aria-current={active ? 'true' : undefined}
            >
              {view.visibility === 'PRIVATE' && (
                <span aria-label="privat" title="Nur für Sie sichtbar" style={{ marginRight: 4 }}>
                  🔒
                </span>
              )}
              {view.name}
            </Link>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ fontSize: 'var(--text-xs)', padding: '2px 6px' }}
              aria-pressed={isDefault}
              aria-label={
                isDefault
                  ? `„${view.name}" ist Ihre Standard-Ansicht — als Standard entfernen`
                  : `„${view.name}" als Standard-Ansicht festlegen`
              }
              title={
                isDefault ? 'Standard-Ansicht (klicken zum Entfernen)' : 'Als Standard festlegen'
              }
              disabled={pending}
              onClick={() => run(isDefault ? clearDefaultView : () => setDefaultView(view.id))}
            >
              {isDefault ? '★' : '☆'}
            </button>
            {canManage && (
              <button
                type="button"
                className="btn btn--ghost"
                style={{ fontSize: 'var(--text-xs)', padding: '2px 6px' }}
                aria-label={`Ansicht „${view.name}" löschen`}
                disabled={pending}
                onClick={() => run(() => deleteSavedView(view.id))}
              >
                ✕
              </button>
            )}
          </span>
        );
      })}

      {canManage &&
        (showForm ? (
          <form action={onSave} className="row" style={{ gap: 6, alignItems: 'center' }}>
            {/* Persist the currently active filters alongside the name. */}
            <input type="hidden" name="status" value={current.status ?? ''} />
            <input type="hidden" name="category" value={current.category ?? ''} />
            <input type="hidden" name="urgency" value={current.urgency ?? ''} />
            <input type="hidden" name="createdWithin" value={current.createdWithin ?? ''} />
            <input type="hidden" name="createdFrom" value={current.createdFrom ?? ''} />
            <input type="hidden" name="createdTo" value={current.createdTo ?? ''} />
            <input type="hidden" name="assignee" value={current.assignee ?? ''} />
            <label htmlFor="saved-view-name" className="visually-hidden">
              Name der Ansicht
            </label>
            <input
              id="saved-view-name"
              name="name"
              style={{ width: 160 }}
              placeholder="Name der Ansicht"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />
            <label
              className="row"
              style={{ gap: 4, alignItems: 'center', fontSize: 'var(--text-xs)' }}
            >
              <input type="checkbox" name="private" value="1" style={{ width: 'auto' }} />
              Nur für mich
            </label>
            <button type="submit" className="btn btn--secondary" disabled={pending || !name.trim()}>
              Speichern
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
            >
              Abbrechen
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!hasActiveFilters}
            title={hasActiveFilters ? undefined : 'Zuerst Filter auswählen'}
            onClick={() => setShowForm(true)}
          >
            + Aktuelle Filter speichern
          </button>
        ))}

      {error && (
        <span
          role="alert"
          className="subtle"
          style={{ color: 'var(--color-danger-500)', fontSize: 'var(--text-xs)' }}
        >
          {error}
        </span>
      )}
    </section>
  );
}
