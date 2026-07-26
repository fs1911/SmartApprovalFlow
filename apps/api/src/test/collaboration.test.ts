import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, call, callAsToken, loginToken, dbAvailable, sampleCase } from './helpers.js';

let dbUp = false;
before(async () => {
  dbUp = await dbAvailable();
});
after(async () => {
  const app = await getApp();
  await app.close();
});

/** Respond as the customer (loginless) to a case token. */
async function customerRespond(token: string, decision: string) {
  const app = await getApp();
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/public/approvals/${token}/respond`,
    headers: { 'content-type': 'application/json' },
    payload: { decision },
  });
  return res.statusCode;
}

test('customer decision notifies the case creator', async (t) => {
  if (!dbUp) return t.skip('no database');
  const owner = await loginToken('owner@muster-garage.ch');

  // Owner creates a case (createdById = owner) and issues a public link.
  const created = await callAsToken('POST', '/api/v1/approval-cases', owner, sampleCase({ subject: 'Notify me' }));
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  const link = await callAsToken('POST', `/api/v1/approval-cases/${id}/generate-public-link`, owner);
  const publicToken = link.body.data.token;

  const before = (await callAsToken('GET', '/api/v1/notifications/unread-count', owner)).body.data.unread;

  assert.equal(await customerRespond(publicToken, 'APPROVE'), 200);

  const after = (await callAsToken('GET', '/api/v1/notifications/unread-count', owner)).body.data.unread;
  assert.ok(after > before, 'unread count increased');

  const list = await callAsToken('GET', '/api/v1/notifications?unread=true', owner);
  const notif = list.body.data.find((n: any) => n.approvalCaseId === id && n.type === 'CASE_APPROVED');
  assert.ok(notif, 'approval notification present');

  // Mark it read; unread count drops.
  const read = await callAsToken('POST', `/api/v1/notifications/${notif.id}/read`, owner);
  assert.equal(read.status, 200);
});

test('read-all clears the unread count', async (t) => {
  if (!dbUp) return t.skip('no database');
  const owner = await loginToken('owner@muster-garage.ch');
  await callAsToken('POST', '/api/v1/notifications/read-all', owner);
  const count = (await callAsToken('GET', '/api/v1/notifications/unread-count', owner)).body.data.unread;
  assert.equal(count, 0);
});

test('assigning a case notifies the assignee and powers the "my cases" filter', async (t) => {
  if (!dbUp) return t.skip('no database');
  const owner = await loginToken('owner@muster-garage.ch');
  const advisor = await loginToken('berater@muster-garage.ch');
  const advisorId = (await callAsToken('GET', '/api/v1/integration/whoami', advisor)).body.data.userId;

  const created = await callAsToken('POST', '/api/v1/approval-cases', owner, sampleCase({ subject: 'Assign me' }));
  const id = created.body.data.id;

  const before = (await callAsToken('GET', '/api/v1/notifications/unread-count', advisor)).body.data.unread;
  const assign = await callAsToken('POST', `/api/v1/approval-cases/${id}/assign`, owner, { assigneeUserId: advisorId });
  assert.equal(assign.status, 200);
  assert.equal(assign.body.data.assigneeUserId, advisorId);

  const after = (await callAsToken('GET', '/api/v1/notifications/unread-count', advisor)).body.data.unread;
  assert.ok(after > before, 'assignee was notified');

  // "My cases" filter returns the assigned case for the advisor.
  const mine = await callAsToken('GET', '/api/v1/approval-cases?assignee=me&limit=100', advisor);
  assert.ok(mine.body.data.some((c: any) => c.id === id), 'assigned case appears in my cases');
});

test('internal notes are visible internally but never on the public page', async (t) => {
  if (!dbUp) return t.skip('no database');
  const owner = await loginToken('owner@muster-garage.ch');
  const created = await callAsToken('POST', '/api/v1/approval-cases', owner, sampleCase({ subject: 'Note test' }));
  const id = created.body.data.id;

  const note = await callAsToken('POST', `/api/v1/approval-cases/${id}/notes`, owner, {
    body: 'INTERNAL-ONLY-SECRET rabatt möglich',
  });
  assert.equal(note.status, 201);

  // Internal detail shows the note.
  const detail = await callAsToken('GET', `/api/v1/approval-cases/${id}`, owner);
  assert.ok(detail.body.data.notes.some((n: any) => n.body.includes('INTERNAL-ONLY-SECRET')));

  // The loginless customer view must NOT leak the note.
  const link = await callAsToken('POST', `/api/v1/approval-cases/${id}/generate-public-link`, owner);
  const publicToken = link.body.data.token;
  const publicView = await call('GET', `/api/v1/public/approvals/${publicToken}`);
  assert.equal(publicView.status, 200);
  assert.ok(!JSON.stringify(publicView.body).includes('INTERNAL-ONLY-SECRET'), 'note not leaked to customer');
});
