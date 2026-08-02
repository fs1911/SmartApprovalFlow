import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, call, dbAvailable } from './helpers.js';

let dbUp = false;
before(async () => {
  dbUp = await dbAvailable();
});
after(async () => {
  const app = await getApp();
  await app.close();
});

// Block 28: /saved-views CRUD, tenant-scoped, cases:read to list, cases:create
// to create/delete, Zod-validated filter keys.

test('creates, lists and deletes a saved view (round-trip)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const name = `View ${Date.now()}`;

  const created = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name, filters: { urgency: 'HIGH', createdWithin: '30d', assignee: 'me' } },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.name, name);
  assert.deepEqual(created.body.data.filters, {
    urgency: 'HIGH',
    createdWithin: '30d',
    assignee: 'me',
  });
  const id = created.body.data.id as string;

  const listed = await call('GET', '/api/v1/saved-views', { role: 'OWNER' });
  assert.equal(listed.status, 200);
  const names = (listed.body.data.views as { id: string; name: string }[]).map((v) => v.name);
  assert.ok(names.includes(name), 'created view appears in the list');

  const removed = await call('DELETE', `/api/v1/saved-views/${id}`, { role: 'OWNER' });
  assert.equal(removed.status, 200);

  const after = await call('GET', '/api/v1/saved-views', { role: 'OWNER' });
  const stillThere = (after.body.data.views as { id: string }[]).some((v) => v.id === id);
  assert.ok(!stillThere, 'deleted view is gone');
});

test('rejects a duplicate name for the same tenant (409)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const name = `Dup ${Date.now()}`;
  const first = await call('POST', '/api/v1/saved-views', { role: 'OWNER', payload: { name } });
  assert.equal(first.status, 201);
  const second = await call('POST', '/api/v1/saved-views', { role: 'OWNER', payload: { name } });
  assert.equal(second.status, 409);
});

test('rejects an unknown filter value (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: `Bad ${Date.now()}`, filters: { urgency: 'NOPE' } },
  });
  assert.equal(res.status, 422);
});

test('rejects an empty name (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('POST', '/api/v1/saved-views', { role: 'OWNER', payload: { name: '' } });
  assert.equal(res.status, 422);
});

test('VIEWER may list but not create (RBAC)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const list = await call('GET', '/api/v1/saved-views', { role: 'VIEWER' });
  assert.equal(list.status, 200);
  const create = await call('POST', '/api/v1/saved-views', {
    role: 'VIEWER',
    payload: { name: `Viewer ${Date.now()}` },
  });
  assert.equal(create.status, 403);
});

test('TECHNICIAN lacks cases:create and cannot create a view (RBAC)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const create = await call('POST', '/api/v1/saved-views', {
    role: 'TECHNICIAN',
    payload: { name: `Tech ${Date.now()}` },
  });
  assert.equal(create.status, 403);
});

test('deleting an unknown id returns 404', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('DELETE', '/api/v1/saved-views/00000000-0000-0000-0000-000000000000', {
    role: 'OWNER',
  });
  assert.equal(res.status, 404);
});

test('saved views are tenant-scoped (isolation)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const name = `Iso ${Date.now()}`;
  const created = await call('POST', '/api/v1/saved-views', { role: 'OWNER', payload: { name } });
  assert.equal(created.status, 201);

  // A request under a different tenant context must not see it.
  const other = await call('GET', '/api/v1/saved-views', {
    role: 'OWNER',
    headers: { 'x-saf-tenant': `ghost-tenant-${Date.now()}` },
  });
  assert.equal(other.status, 200);
  const leaked = (other.body.data.views as { name: string }[]).some((v) => v.name === name);
  assert.ok(!leaked, 'another tenant does not see this view');
});
