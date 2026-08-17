import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, call, callAsToken, loginToken, dbAvailable } from './helpers.js';

let dbUp = false;
let ownerToken = '';
let advisorToken = '';

before(async () => {
  dbUp = await dbAvailable();
  if (dbUp) {
    ownerToken = await loginToken('owner@muster-garage.ch', 'password123');
    advisorToken = await loginToken('berater@muster-garage.ch', 'password123');
  }
});
after(async () => {
  const app = await getApp();
  await app.close();
});

// Block 33: duplicate a saved view. The copy inherits filters + visibility,
// is named "<name> (Kopie)" (auto-incrementing), lands at the end, and is
// visibility-scoped (a foreign private source is invisible → 404).

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

test('duplicating a shared view copies its filters and visibility', async (t) => {
  if (!dbUp) return t.skip('no database');
  const filters = { urgency: 'HIGH', category: 'SAFETY' };
  const base = uniqueName('Dup-Quelle');
  const created = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: base, filters },
  });
  const id = created.body.data.id as string;

  const dup = await call('POST', `/api/v1/saved-views/${id}/duplicate`, { role: 'OWNER' });
  assert.equal(dup.status, 201);
  assert.equal(dup.body.data.name, `${base} (Kopie)`);
  assert.equal(dup.body.data.visibility, 'SHARED');
  assert.deepEqual(dup.body.data.filters, filters);
  assert.notEqual(dup.body.data.id, id, 'a new view is created');
});

test('duplicating twice increments the copy suffix', async (t) => {
  if (!dbUp) return t.skip('no database');
  const base = uniqueName('Dup-Zwei');
  const created = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: base },
  });
  const id = created.body.data.id as string;

  const first = await call('POST', `/api/v1/saved-views/${id}/duplicate`, { role: 'OWNER' });
  assert.equal(first.body.data.name, `${base} (Kopie)`);

  const second = await call('POST', `/api/v1/saved-views/${id}/duplicate`, { role: 'OWNER' });
  assert.equal(second.body.data.name, `${base} (Kopie 2)`);
});

test('a duplicated private view stays private to its owner', async (t) => {
  if (!dbUp) return t.skip('no database');
  const base = uniqueName('Dup-Privat');
  const created = await callAsToken('POST', '/api/v1/saved-views', ownerToken, {
    name: base,
    visibility: 'PRIVATE',
  });
  const id = created.body.data.id as string;

  const dup = await callAsToken('POST', `/api/v1/saved-views/${id}/duplicate`, ownerToken);
  assert.equal(dup.status, 201);
  assert.equal(dup.body.data.visibility, 'PRIVATE');
  const dupId = dup.body.data.id as string;

  const others = await callAsToken('GET', '/api/v1/saved-views', advisorToken);
  assert.ok(
    !(others.body.data.views as { id: string }[]).some((v) => v.id === dupId),
    'another user does not see the duplicated private view',
  );
});

test('duplicating a foreign private view reports 404 (no leak)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const priv = await callAsToken('POST', '/api/v1/saved-views', advisorToken, {
    name: uniqueName('Fremd-Privat'),
    visibility: 'PRIVATE',
  });
  const id = priv.body.data.id as string;

  const res = await callAsToken('POST', `/api/v1/saved-views/${id}/duplicate`, ownerToken);
  assert.equal(res.status, 404);
});

test('duplicating requires cases:create (VIEWER is rejected)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Dup-RBAC') },
  });
  const id = created.body.data.id as string;

  const res = await call('POST', `/api/v1/saved-views/${id}/duplicate`, { role: 'VIEWER' });
  assert.equal(res.status, 403);
});
