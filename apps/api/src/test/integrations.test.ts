import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, call, dbAvailable, sampleCase } from './helpers.js';

let dbUp = false;
before(async () => {
  dbUp = await dbAvailable();
});
after(async () => {
  const app = await getApp();
  await app.close();
});

/** Call with an API-key bearer token instead of dev headers. */
async function callWithKey(method: 'GET' | 'POST', url: string, key: string, payload?: unknown) {
  const app = await getApp();
  const res = await app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    payload: payload as object | undefined,
  });
  let body: any = null;
  try {
    body = res.json();
  } catch {
    body = res.body;
  }
  return { status: res.statusCode, body };
}

test('webhook endpoint CRUD + rotate + test delivery', async (t) => {
  if (!dbUp) return t.skip('no database');

  // Create — secret returned once.
  const created = await call('POST', '/api/v1/webhook-endpoints', {
    role: 'OWNER',
    payload: { url: 'http://127.0.0.1:1/unreachable', events: ['approval_case.approved'] },
  });
  assert.equal(created.status, 201);
  assert.match(created.body.data.secret, /^whsec_/);
  const id = created.body.data.id;

  // List — no secret exposed.
  const list = await call('GET', '/api/v1/webhook-endpoints', { role: 'OWNER' });
  assert.equal(list.status, 200);
  const row = list.body.data.endpoints.find((e: any) => e.id === id);
  assert.ok(row);
  assert.equal(row.secret, undefined);

  // Rotate secret — new value returned once.
  const rot = await call('POST', `/api/v1/webhook-endpoints/${id}/rotate-secret`, { role: 'OWNER' });
  assert.equal(rot.status, 200);
  assert.match(rot.body.data.secret, /^whsec_/);
  assert.notEqual(rot.body.data.secret, created.body.data.secret);

  // Test delivery — the worker runs (endpoint unreachable → attempt recorded).
  const test = await call('POST', `/api/v1/webhook-endpoints/${id}/test`, { role: 'OWNER' });
  assert.equal(test.status, 200);
  assert.ok(test.body.data.deliveryId);
  assert.ok(test.body.data.delivery.attempts >= 1);

  // Deliveries list shows the test delivery.
  const deliveries = await call('GET', `/api/v1/webhook-endpoints/${id}/deliveries`, { role: 'OWNER' });
  assert.equal(deliveries.status, 200);
  assert.ok(deliveries.body.data.some((d: any) => d.eventType === 'webhook.test'));

  // RBAC: a VIEWER cannot manage endpoints.
  const forbidden = await call('POST', '/api/v1/webhook-endpoints', {
    role: 'VIEWER',
    payload: { url: 'http://example.com/hook' },
  });
  assert.equal(forbidden.status, 403);

  // Delete.
  const del = await call('DELETE', `/api/v1/webhook-endpoints/${id}`, { role: 'OWNER' });
  assert.equal(del.status, 200);
});

test('concurrent case creation never collides on the per-tenant reference', async (t) => {
  if (!dbUp) return t.skip('no database');
  // Fire many creates at once — the count-based reference would otherwise race
  // into a duplicate-key error (regression guard for the CI failure).
  const results = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      call('POST', '/api/v1/approval-cases', { role: 'OWNER', payload: sampleCase({ subject: `Concurrent ${i}` }) }),
    ),
  );
  for (const r of results) assert.equal(r.status, 201);
  const refs = results.map((r) => r.body.data.reference);
  assert.equal(new Set(refs).size, refs.length, 'all references are unique');
});

test('incoming integration: API key can create a case; missing scope is forbidden', async (t) => {
  if (!dbUp) return t.skip('no database');

  // Create a scoped API key (members:manage required to mint keys).
  const key = await call('POST', '/api/v1/api-keys', {
    role: 'OWNER',
    payload: { name: 'integration-test', scopes: 'cases:read cases:create' },
  });
  assert.equal(key.status, 201);
  const rawKey: string = key.body.data.key;
  assert.match(rawKey, /^saf_/);

  // whoami confirms the key + its scopes.
  const who = await callWithKey('GET', '/api/v1/integration/whoami', rawKey);
  assert.equal(who.status, 200);
  assert.equal(who.body.data.via, 'api_key');
  assert.ok(who.body.data.permissions.includes('cases:create'));

  // The key can create a case.
  const createdCase = await callWithKey('POST', '/api/v1/approval-cases', rawKey, sampleCase({ subject: 'Via API key' }));
  assert.equal(createdCase.status, 201);

  // A read-only key cannot create.
  const roKey = await call('POST', '/api/v1/api-keys', {
    role: 'OWNER',
    payload: { name: 'readonly-test', scopes: 'cases:read' },
  });
  const roRaw: string = roKey.body.data.key;
  const denied = await callWithKey('POST', '/api/v1/approval-cases', roRaw, sampleCase());
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, 'FORBIDDEN');
});
