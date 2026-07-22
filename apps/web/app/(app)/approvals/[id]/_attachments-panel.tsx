'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerAttachment, finishAttachment, deleteAttachment } from './actions';

export interface AttachmentView {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  approvalItemId: string | null;
  uploadedAt: string | null;
  url: string | null;
}

interface ItemOption {
  id: string;
  title: string;
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Photo management for a case. Two-step upload: a server action registers the
 * attachment (authed) and returns a signed upload URL; the browser then PUTs the
 * raw bytes straight to the API (local dev) / storage provider.
 */
export function AttachmentsPanel({
  caseId,
  attachments,
  items,
  canManage,
}: {
  caseId: string;
  attachments: AttachmentView[];
  items: ItemOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [itemId, setItemId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError('Nur Bilddateien (JPEG, PNG, WebP, HEIC) sind erlaubt.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Datei ist zu gross (max. 15 MB).');
      return;
    }
    setBusy(true);
    try {
      const reg = await registerAttachment(caseId, {
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        approvalItemId: itemId || undefined,
      });
      if (!reg.ok || !reg.uploadUrl) {
        setError(reg.error ?? 'Upload fehlgeschlagen.');
        return;
      }
      const put = await fetch(reg.uploadUrl, {
        method: reg.method ?? 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });
      if (!put.ok) {
        setError(`Upload fehlgeschlagen (${put.status}).`);
        return;
      }
      await finishAttachment(caseId);
      router.refresh();
    } catch {
      setError('Upload fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onDelete(attachmentId: string) {
    setBusy(true);
    const res = await deleteAttachment(caseId, attachmentId);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Löschen fehlgeschlagen.');
    else router.refresh();
  }

  const uploaded = attachments.filter((a) => a.uploadedAt && a.url);

  return (
    <div className="stack">
      {uploaded.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {uploaded.map((a) => (
            <figure key={a.id} style={{ margin: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url!}
                alt={a.fileName}
                style={{
                  width: '100%',
                  height: 90,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              />
              {canManage && (
                <button
                  className="btn btn--ghost"
                  style={{ fontSize: 'var(--text-xs)', padding: '2px 6px', marginTop: 2 }}
                  disabled={busy}
                  onClick={() => onDelete(a.id)}
                >
                  Entfernen
                </button>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <p className="subtle" style={{ margin: 0 }}>
          Noch keine Fotos. Fotos erhöhen die Freigabequote spürbar.
        </p>
      )}

      {canManage && (
        <div className="stack" style={{ gap: 6 }}>
          {items.length > 0 && (
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="att-item" style={{ fontSize: 'var(--text-xs)' }}>
                Foto einer Position zuordnen (optional)
              </label>
              <select id="att-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Ganzer Fall</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label htmlFor="att-file" style={{ fontSize: 'var(--text-xs)' }}>
            Foto hochladen (JPEG, PNG, WebP, HEIC · max. 15 MB)
          </label>
          <input
            id="att-file"
            ref={fileRef}
            type="file"
            accept={ALLOWED.join(',')}
            disabled={busy}
            aria-busy={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          {busy && (
            <p className="subtle" style={{ margin: 0 }} aria-live="polite">
              Wird hochgeladen…
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
  );
}
