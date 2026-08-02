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

// Block 27: GET /approval-cases urgency + createdWithin filters (Zod-validated).
test('list filters cases by urgency', async (t) => {
  if (!dbUp) return t.skip('no database');
  const marker = `URGFILTER-${Date.now()}`;

  const high = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    payload: {
      subject: `${marker} high`,
      urgency: 'HIGH',
      customer: { name: 'Kunde H', email: 'h@example.com' },
      items: [{ title: 'Bremsen' }],
    },
  });
  assert.equal(high.status, 201);

  const low = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    payload: {
      subject: `${marker} low`,
      urgency: 'LOW',
      customer: { name: 'Kunde L', email: 'l@example.com' },
      items: [{ title: 'Wischer' }],
    },
  });
  assert.equal(low.status, 201);

  const onlyHigh = await call('GET', '/api/v1/approval-cases?limit=100&urgency=HIGH', {
    role: 'OWNER',
  });
  assert.equal(onlyHigh.status, 200);
  const subjects = (onlyHigh.body.data as { subject: string }[])
    .map((c) => c.subject)
    .filter((s) => s.startsWith(marker));
  assert.deepEqual(subjects, [`${marker} high`]);
});

test('list accepts createdWithin and still returns recent cases', async (t) => {
  if (!dbUp) return t.skip('no database');
  const marker = `WITHIN-${Date.now()}`;
  const created = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    payload: {
      subject: `${marker} fresh`,
      customer: { name: 'Kunde W', email: 'w@example.com' },
      items: [{ title: 'Ölwechsel' }],
    },
  });
  assert.equal(created.status, 201);

  const within = await call('GET', '/api/v1/approval-cases?limit=100&createdWithin=7d', {
    role: 'OWNER',
  });
  assert.equal(within.status, 200);
  const found = (within.body.data as { subject: string }[]).some((c) => c.subject === `${marker} fresh`);
  assert.ok(found, 'a just-created case is within the 7d window');
});

test('list rejects an unknown urgency (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/approval-cases?urgency=NOPE', { role: 'OWNER' });
  assert.equal(res.status, 422);
});

test('list rejects an unknown createdWithin (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/approval-cases?createdWithin=5y', { role: 'OWNER' });
  assert.equal(res.status, 422);
});
