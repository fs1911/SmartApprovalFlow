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

// Block 32: rename + manual reorder of saved views. Renaming/reordering need
// cases:create, are visibility-scoped, and never leak another user's private
// views. SHARED views work with dev-header auth (no concrete user needed).

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

test('renaming a shared view updates its name', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Umbenennen-alt') },
  });
  const id = created.body.data.id as string;
  const newName = uniqueName('Umbenennen-neu');

  const patched = await call('PATCH', `/api/v1/saved-views/${id}`, {
    role: 'OWNER',
    payload: { name: newName },
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.data.name, newName);

  const listed = await call('GET', '/api/v1/saved-views', { role: 'OWNER' });
  const found = (listed.body.data.views as { id: string; name: string }[]).find((v) => v.id === id);
  assert.equal(found?.name, newName);
});

test('renaming to an existing name conflicts (409)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const taken = uniqueName('Belegt');
  await call('POST', '/api/v1/saved-views', { role: 'OWNER', payload: { name: taken } });
  const other = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Anders') },
  });
  const id = other.body.data.id as string;

  const res = await call('PATCH', `/api/v1/saved-views/${id}`, {
    role: 'OWNER',
    payload: { name: taken },
  });
  assert.equal(res.status, 409);
});

test('renaming a non-existent/invisible view reports 404 (no leak)', async (t) => {
  if (!dbUp) return t.skip('no database');
  // advisor's PRIVATE view is invisible to the owner → 404, not 403.
  const priv = await callAsToken('POST', '/api/v1/saved-views', advisorToken, {
    name: uniqueName('AdvPrivat'),
    visibility: 'PRIVATE',
  });
  const id = priv.body.data.id as string;

  const res = await callAsToken('PATCH', `/api/v1/saved-views/${id}`, ownerToken, {
    name: uniqueName('Kaputt'),
  });
  assert.equal(res.status, 404);
});

test('renaming requires cases:create (VIEWER is rejected)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('RBAC') },
  });
  const id = created.body.data.id as string;

  const res = await call('PATCH', `/api/v1/saved-views/${id}`, {
    role: 'VIEWER',
    payload: { name: uniqueName('Verboten') },
  });
  assert.equal(res.status, 403);
});

test('reordering writes the manual order and GET reflects it', async (t) => {
  if (!dbUp) return t.skip('no database');
  const a = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Sort-A') },
  });
  const b = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Sort-B') },
  });
  const c = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Sort-C') },
  });
  const ids = [a.body.data.id, b.body.data.id, c.body.data.id] as string[];
  const desired = [ids[2], ids[0], ids[1]]; // C, A, B

  const res = await call('POST', '/api/v1/saved-views/reorder', {
    role: 'OWNER',
    payload: { orderedIds: desired },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.orderedIds, desired);

  const listed = await call('GET', '/api/v1/saved-views', { role: 'OWNER' });
  const mine = (listed.body.data.views as { id: string }[])
    .map((v) => v.id)
    .filter((id) => ids.includes(id));
  assert.deepEqual(mine, desired, 'GET returns views in the manual order');
});

test('reorder ignores ids the caller cannot see (isolation)', async (t) => {
  if (!dbUp) return t.skip('no database');
  // advisor's private view id must never be reordered by the owner.
  const priv = await callAsToken('POST', '/api/v1/saved-views', advisorToken, {
    name: uniqueName('FremdPrivat'),
    visibility: 'PRIVATE',
  });
  const foreignId = priv.body.data.id as string;
  const mine = await callAsToken('POST', '/api/v1/saved-views', ownerToken, {
    name: uniqueName('Eigen'),
  });
  const myId = mine.body.data.id as string;

  const res = await callAsToken('POST', '/api/v1/saved-views/reorder', ownerToken, {
    orderedIds: [foreignId, myId],
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.orderedIds, [myId], 'foreign id is dropped, not applied');
});
