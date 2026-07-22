import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getApp, call, dbAvailable, sampleCase } from './helpers.js';

// Gate the whole suite on a reachable, seeded database.
let dbUp = false;
before(async () => {
  dbUp = await dbAvailable();
});
after(async () => {
  const app = await getApp();
  await app.close();
});

test('health is live and readiness confirms the database', async (t) => {
  if (!dbUp) return t.skip('no database');
  const live = await call('GET', '/api/v1/health');
  assert.equal(live.status, 200);
  assert.equal(live.body.data.status, 'ok');

  const ready = await call('GET', '/api/v1/health/ready');
  assert.equal(ready.status, 200);
  assert.equal(ready.body.data.checks.database.ok, true);
});

test('OWNER can create a case; VIEWER cannot (RBAC)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const owner = await call('POST', '/api/v1/approval-cases', { role: 'OWNER', payload: sampleCase() });
  assert.equal(owner.status, 201);
  assert.ok(owner.body.data.id);
  assert.equal(owner.body.data.items.length, 1);

  const viewer = await call('POST', '/api/v1/approval-cases', { role: 'VIEWER', payload: sampleCase() });
  assert.equal(viewer.status, 403);
  assert.equal(viewer.body.error.code, 'FORBIDDEN');
});

test('unknown case id is a tenant-safe 404', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', `/api/v1/approval-cases/${randomUUID()}`);
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('idempotency: same key replays, reused key with new body is a 409', async (t) => {
  if (!dbUp) return t.skip('no database');
  const key = randomUUID();
  const first = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    headers: { 'idempotency-key': key },
    payload: sampleCase({ subject: 'Idem A' }),
  });
  assert.equal(first.status, 201);

  const replay = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    headers: { 'idempotency-key': key },
    payload: sampleCase({ subject: 'Idem A' }),
  });
  assert.equal(replay.status, 201);
  assert.equal(replay.body.data.id, first.body.data.id); // same row, not a new one

  const reuse = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    headers: { 'idempotency-key': key },
    payload: sampleCase({ subject: 'Idem B (different)' }),
  });
  assert.equal(reuse.status, 409);
  assert.equal(reuse.body.error.code, 'IDEMPOTENCY_KEY_REUSED');
});

test('public flow: whole-case approval', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await call('POST', '/api/v1/approval-cases', { role: 'OWNER', payload: sampleCase() });
  const id = created.body.data.id;

  const link = await call('POST', `/api/v1/approval-cases/${id}/generate-public-link`, { role: 'OWNER' });
  assert.equal(link.status, 201);
  const token = link.body.data.token;

  const view = await call('GET', `/api/v1/public/approvals/${token}`);
  assert.equal(view.status, 200);
  assert.equal(view.body.data.items.length, 1);

  const respond = await call('POST', `/api/v1/public/approvals/${token}/respond`, {
    payload: { decision: 'APPROVE' },
  });
  assert.equal(respond.status, 200);
  assert.equal(respond.body.data.status, 'APPROVED');
});

test('public flow: per-item decisions aggregate to PARTIALLY_APPROVED', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    payload: sampleCase({
      items: [
        { title: 'Bremsen', priceBand: { minMinor: 18000, maxMinor: 24000, currency: 'CHF' } },
        { title: 'Ölservice', priceBand: { minMinor: 12000, maxMinor: 15000, currency: 'CHF' } },
      ],
    }),
  });
  const id = created.body.data.id;
  const it1 = created.body.data.items[0].id;
  const it2 = created.body.data.items[1].id;

  const link = await call('POST', `/api/v1/approval-cases/${id}/generate-public-link`, { role: 'OWNER' });
  const token = link.body.data.token;

  const respond = await call('POST', `/api/v1/public/approvals/${token}/respond-items`, {
    payload: { items: [{ itemId: it1, decision: 'APPROVE' }, { itemId: it2, decision: 'DECLINE' }] },
  });
  assert.equal(respond.status, 200);
  assert.equal(respond.body.data.status, 'PARTIALLY_APPROVED');
});

test('reminders/run and maintenance/cleanup respond with a summary and enforce RBAC', async (t) => {
  if (!dbUp) return t.skip('no database');
  const reminders = await call('POST', '/api/v1/reminders/run', { role: 'OWNER' });
  assert.equal(reminders.status, 200);
  assert.equal(typeof reminders.body.data.evaluated, 'number');

  const cleanup = await call('POST', '/api/v1/maintenance/cleanup', { role: 'OWNER' });
  assert.equal(cleanup.status, 200);
  assert.equal(typeof cleanup.body.data.idempotencyRemoved, 'number');

  const forbidden = await call('POST', '/api/v1/maintenance/cleanup', { role: 'TECHNICIAN' });
  assert.equal(forbidden.status, 403);
});
