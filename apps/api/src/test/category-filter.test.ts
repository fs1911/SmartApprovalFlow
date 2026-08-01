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

// Block 26: GET /approval-cases?category=… returns only cases that have at
// least one position of that category. Uses a unique marker subject so the
// assertions are robust regardless of other seeded/created cases.
test('list filters cases by position category', async (t) => {
  if (!dbUp) return t.skip('no database');
  const marker = `CATFILTER-${Date.now()}`;

  const safety = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    payload: {
      subject: `${marker} safety`,
      customer: { name: 'Kunde A', email: 'a@example.com' },
      items: [{ title: 'Bremsen prüfen', category: 'SAFETY' }],
    },
  });
  assert.equal(safety.status, 201);

  const maint = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    payload: {
      subject: `${marker} maintenance`,
      customer: { name: 'Kunde B', email: 'b@example.com' },
      items: [{ title: 'Ölwechsel', category: 'MAINTENANCE' }],
    },
  });
  assert.equal(maint.status, 201);

  const onlySafety = await call('GET', '/api/v1/approval-cases?limit=100&category=SAFETY', {
    role: 'OWNER',
  });
  assert.equal(onlySafety.status, 200);
  const subjects = (onlySafety.body.data as { subject: string }[])
    .map((c) => c.subject)
    .filter((s) => s.startsWith(marker));
  assert.deepEqual(subjects, [`${marker} safety`]);
});

test('list rejects an unknown category (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/approval-cases?category=BOGUS', { role: 'OWNER' });
  assert.equal(res.status, 422);
});
