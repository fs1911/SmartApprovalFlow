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

// Block 29: private (per-user) views + personal default view. These need a real
// user session (userId), so they drive the API with Bearer tokens.

test('a PRIVATE view is visible to its creator but not to another user', async (t) => {
  if (!dbUp) return t.skip('no database');
  const name = `Privat ${Date.now()}`;
  const created = await callAsToken('POST', '/api/v1/saved-views', ownerToken, {
    name,
    visibility: 'PRIVATE',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.visibility, 'PRIVATE');

  const mine = await callAsToken('GET', '/api/v1/saved-views', ownerToken);
  assert.ok((mine.body.data.views as { name: string }[]).some((v) => v.name === name));

  const others = await callAsToken('GET', '/api/v1/saved-views', advisorToken);
  assert.ok(
    !(others.body.data.views as { name: string }[]).some((v) => v.name === name),
    'another user does not see a private view',
  );
});

test('a SHARED view is visible to every user in the workspace', async (t) => {
  if (!dbUp) return t.skip('no database');
  const name = `Geteilt ${Date.now()}`;
  const created = await callAsToken('POST', '/api/v1/saved-views', ownerToken, { name });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.visibility, 'SHARED');

  const others = await callAsToken('GET', '/api/v1/saved-views', advisorToken);
  assert.ok((others.body.data.views as { name: string }[]).some((v) => v.name === name));
});

test('creating a PRIVATE view without a user session is rejected (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  // Dev-header auth has a role but no concrete user → private is meaningless.
  const res = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: `NoUser ${Date.now()}`, visibility: 'PRIVATE' },
  });
  assert.equal(res.status, 422);
});

test('another user cannot delete my private view (404, no leak)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const name = `Privat-del ${Date.now()}`;
  const created = await callAsToken('POST', '/api/v1/saved-views', ownerToken, {
    name,
    visibility: 'PRIVATE',
  });
  const id = created.body.data.id as string;

  const foreign = await callAsToken('DELETE', `/api/v1/saved-views/${id}`, advisorToken);
  assert.equal(foreign.status, 404);

  const own = await callAsToken('DELETE', `/api/v1/saved-views/${id}`, ownerToken);
  assert.equal(own.status, 200);
});

test('setting and clearing the personal default view', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await callAsToken('POST', '/api/v1/saved-views', ownerToken, {
    name: `Default ${Date.now()}`,
    filters: { urgency: 'HIGH' },
  });
  const id = created.body.data.id as string;

  const set = await callAsToken('POST', '/api/v1/saved-views/default', ownerToken, {
    savedViewId: id,
  });
  assert.equal(set.status, 200);
  assert.equal(set.body.data.defaultViewId, id);

  const listed = await callAsToken('GET', '/api/v1/saved-views', ownerToken);
  assert.equal(listed.body.data.defaultViewId, id);

  const cleared = await callAsToken('DELETE', '/api/v1/saved-views/default', ownerToken);
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.data.defaultViewId, null);

  const afterClear = await callAsToken('GET', '/api/v1/saved-views', ownerToken);
  assert.equal(afterClear.body.data.defaultViewId, null);
});

test('the default is per user (one user does not affect another)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await callAsToken('POST', '/api/v1/saved-views', ownerToken, {
    name: `PerUser ${Date.now()}`,
  });
  const id = created.body.data.id as string;
  await callAsToken('POST', '/api/v1/saved-views/default', ownerToken, { savedViewId: id });

  // The advisor sees the same SHARED view but has no default of their own.
  const advisorList = await callAsToken('GET', '/api/v1/saved-views', advisorToken);
  assert.notEqual(advisorList.body.data.defaultViewId, id);
});

test('cannot default to a view not visible to the caller (404)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const advPrivate = await callAsToken('POST', '/api/v1/saved-views', advisorToken, {
    name: `AdvPrivat ${Date.now()}`,
    visibility: 'PRIVATE',
  });
  const id = advPrivate.body.data.id as string;

  const res = await callAsToken('POST', '/api/v1/saved-views/default', ownerToken, {
    savedViewId: id,
  });
  assert.equal(res.status, 404);
});

test('deleting a view clears it as a default (cascade)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await callAsToken('POST', '/api/v1/saved-views', ownerToken, {
    name: `Cascade ${Date.now()}`,
  });
  const id = created.body.data.id as string;
  await callAsToken('POST', '/api/v1/saved-views/default', ownerToken, { savedViewId: id });

  const del = await callAsToken('DELETE', `/api/v1/saved-views/${id}`, ownerToken);
  assert.equal(del.status, 200);

  const listed = await callAsToken('GET', '/api/v1/saved-views', ownerToken);
  assert.equal(listed.body.data.defaultViewId, null, 'default cleared when its view is deleted');
});

test('setting a default without a user session is rejected (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('POST', '/api/v1/saved-views/default', {
    role: 'OWNER',
    payload: { savedViewId: '00000000-0000-0000-0000-000000000000' },
  });
  assert.equal(res.status, 422);
});
