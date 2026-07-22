'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createApiKey,
  revokeApiKey,
  createWebhook,
  rotateWebhookSecret,
  toggleWebhook,
  deleteWebhook,
  testWebhook,
} from './actions';

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  revokedAt: string | null;
}
export interface WebhookRow {
  id: string;
  url: string;
  events: string;
  isActive: boolean;
}
export interface DeveloperData {
  apiKeys: ApiKeyRow[];
  availableScopes: string[];
  webhooks: WebhookRow[];
  availableEvents: string[];
}

/** Reveal-once secret box. */
function SecretBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="alert alert--info" role="status" style={{ wordBreak: 'break-all' }}>
      <strong>{label}</strong> — jetzt kopieren, er wird nicht erneut angezeigt:
      <br />
      <code>{value}</code>
    </div>
  );
}

export function DeveloperPanel({ data }: { data: DeveloperData }) {
  const router = useRouter();

  // API keys
  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState<string[]>(['cases:read', 'cases:create']);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyErr, setKeyErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Webhooks
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvents, setHookEvents] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [hookErr, setHookErr] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  function toggle(list: string[], v: string, set: (x: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function onCreateKey() {
    setBusy(true);
    setKeyErr(null);
    setNewKey(null);
    const res = await createApiKey(keyName, keyScopes);
    setBusy(false);
    if (!res.ok) return setKeyErr(res.error ?? 'Fehler');
    setKeyName('');
    setNewKey(res.key ?? null);
    router.refresh();
  }

  async function onCreateHook() {
    setBusy(true);
    setHookErr(null);
    setNewSecret(null);
    const res = await createWebhook(hookUrl, hookEvents);
    setBusy(false);
    if (!res.ok) return setHookErr(res.error ?? 'Fehler');
    setHookUrl('');
    setNewSecret(res.secret ?? null);
    router.refresh();
  }

  async function onTest(id: string) {
    setTestMsg(null);
    const res = await testWebhook(id);
    if (!res.ok) setTestMsg(res.error ?? 'Testzustellung fehlgeschlagen.');
    else
      setTestMsg(
        `Testzustellung: Status ${res.status}, Versuche ${res.attempts}${res.lastError ? ` (${res.lastError})` : ''}.`,
      );
    router.refresh();
  }

  return (
    <div className="stack">
      <h2 style={{ marginTop: 8 }}>Entwickler &amp; Integrationen</h2>
      <p className="subtle" style={{ marginTop: -8 }}>
        API-Keys und Webhooks für die Anbindung Ihrer Garagensoftware. Siehe{' '}
        <code>docs/integrations-guide.md</code>.
      </p>

      {/* API keys */}
      <div className="card">
        <div className="card__body stack">
          <h3 style={{ margin: 0 }}>API-Keys</h3>
          {newKey && <SecretBox label="Neuer API-Key" value={newKey} />}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: '1 1 200px', margin: 0 }}>
              <label htmlFor="key-name">Name</label>
              <input id="key-name" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="z. B. Werkstattsoftware" />
            </div>
            <button className="btn btn--primary" disabled={busy} aria-busy={busy} onClick={() => void onCreateKey()}>
              Key erstellen
            </button>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {data.availableScopes.map((s) => (
              <label key={s} style={{ display: 'inline-flex', gap: 4, fontSize: 'var(--text-xs)' }}>
                <input type="checkbox" checked={keyScopes.includes(s)} onChange={() => toggle(keyScopes, s, setKeyScopes)} />
                {s}
              </label>
            ))}
          </div>
          {keyErr && <div className="alert alert--danger" role="alert">{keyErr}</div>}
          {data.apiKeys.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              {data.apiKeys.map((k) => (
                <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 4 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {k.name} <code style={{ fontSize: 'var(--text-xs)' }}>{k.keyPrefix}…</code>
                      {k.revokedAt && <span className="subtle"> · widerrufen</span>}
                    </div>
                    <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>{k.scopes || 'keine Scopes'}</div>
                  </div>
                  {!k.revokedAt && (
                    <button className="btn btn--ghost" disabled={busy} onClick={async () => { await revokeApiKey(k.id); router.refresh(); }}>
                      Widerrufen
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Webhooks */}
      <div className="card">
        <div className="card__body stack">
          <h3 style={{ margin: 0 }}>Webhook-Endpoints</h3>
          {newSecret && <SecretBox label="Signatur-Secret" value={newSecret} />}
          {testMsg && <div className="alert alert--info" role="status">{testMsg}</div>}
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="hook-url">Endpoint-URL</label>
            <input id="hook-url" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://ihre-software.example/webhooks/saf" />
          </div>
          <details>
            <summary className="subtle" style={{ fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
              Event-Auswahl (leer = alle Events)
            </summary>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {data.availableEvents.map((ev) => (
                <label key={ev} style={{ display: 'inline-flex', gap: 4, fontSize: 'var(--text-xs)' }}>
                  <input type="checkbox" checked={hookEvents.includes(ev)} onChange={() => toggle(hookEvents, ev, setHookEvents)} />
                  {ev}
                </label>
              ))}
            </div>
          </details>
          <div>
            <button className="btn btn--primary" disabled={busy} aria-busy={busy} onClick={() => void onCreateHook()}>
              Endpoint hinzufügen
            </button>
          </div>
          {hookErr && <div className="alert alert--danger" role="alert">{hookErr}</div>}
          {data.webhooks.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              {data.webhooks.map((w) => (
                <div key={w.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
                  <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>
                    {w.url} {!w.isActive && <span className="subtle">· inaktiv</span>}
                  </div>
                  <div className="subtle" style={{ fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                    {w.events || 'alle Events'}
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn--secondary" onClick={() => void onTest(w.id)}>Test senden</button>
                    <button className="btn btn--ghost" onClick={async () => { await rotateWebhookSecret(w.id).then((r) => setNewSecret(r.secret ?? null)); router.refresh(); }}>
                      Secret rotieren
                    </button>
                    <button className="btn btn--ghost" onClick={async () => { await toggleWebhook(w.id, !w.isActive); router.refresh(); }}>
                      {w.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button className="btn btn--ghost" onClick={async () => { await deleteWebhook(w.id); router.refresh(); }}>
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
