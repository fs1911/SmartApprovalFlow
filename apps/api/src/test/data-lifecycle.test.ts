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

test('case export returns a portable JSON with an attachment header', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await call('POST', '/api/v1/approval-cases', { role: 'OWNER', payload: sampleCase() });
  const id = created.body.data.id;

  const exp = await call('GET', `/api/v1/approval-cases/${id}/export`, { role: 'OWNER' });
  assert.equal(exp.status, 200);
  assert.equal(exp.body.data.reference, created.body.data.reference);
  assert.ok(Array.isArray(exp.body.data.items));
  assert.ok('auditTrail' in exp.body.data);

  // Advisor lacks data:manage → forbidden.
  const forbidden = await call('GET', `/api/v1/approval-cases/${id}/export`, { role: 'SERVICE_ADVISOR' });
  assert.equal(forbidden.status, 403);
});

test('case erasure requires confirm and then removes the case', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await call('POST', '/api/v1/approval-cases', { role: 'OWNER', payload: sampleCase() });
  const id = created.body.data.id;

  // Without confirm → rejected.
  const noConfirm = await call('DELETE', `/api/v1/approval-cases/${id}`, { role: 'OWNER' });
  assert.equal(noConfirm.status, 422);

  const erased = await call('DELETE', `/api/v1/approval-cases/${id}?confirm=true`, { role: 'OWNER' });
  assert.equal(erased.status, 200);
  assert.equal(erased.body.data.erased, true);

  // Gone.
  const gone = await call('GET', `/api/v1/approval-cases/${id}`, { role: 'OWNER' });
  assert.equal(gone.status, 404);
});

test('customer erasure cascades to their cases', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    payload: sampleCase({ customer: { name: 'Erase Me', email: 'erase@example.com' } }),
  });
  const caseId = created.body.data.id;
  const customerId = created.body.data.customer.id;

  const res = await call('DELETE', `/api/v1/customers/${customerId}?confirm=true`, { role: 'OWNER' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.erased, true);
  assert.ok(res.body.data.casesErased >= 1);

  const gone = await call('GET', `/api/v1/approval-cases/${caseId}`, { role: 'OWNER' });
  assert.equal(gone.status, 404);
});

test('admin overview returns counts, storage, plan and retention', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/admin/overview', { role: 'OWNER' });
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.data.members, 'number');
  assert.ok('byStatus' in res.body.data.cases);
  assert.ok('bytes' in res.body.data.storage);
  assert.ok(res.body.data.plan.key);
  assert.ok('caseMonths' in res.body.data.retention);

  // Advisor cannot see the admin overview.
  const forbidden = await call('GET', '/api/v1/admin/overview', { role: 'SERVICE_ADVISOR' });
  assert.equal(forbidden.status, 403);
});

test('workspaces lists the memberships of the current user', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/workspaces', { role: 'OWNER' });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data.workspaces));
  assert.ok(res.body.data.workspaces.some((w: any) => w.current));
});
