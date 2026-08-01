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

// Block 22: the new-case form now submits a dynamic item list. This guards the
// backend path it relies on — a case with several positions round-trips intact.
test('create a case with multiple items persists all positions', async (t) => {
  if (!dbUp) return t.skip('no database');
  const created = await call('POST', '/api/v1/approval-cases', {
    role: 'SERVICE_ADVISOR',
    payload: {
      subject: 'Mehrere Positionen',
      customer: { name: 'Testkunde', email: 'multi@example.com' },
      items: [
        {
          title: 'Bremsbeläge vorne ersetzen',
          category: 'SAFETY',
          description: 'Beläge unter Verschleissgrenze.',
          priceBand: { minMinor: 18000, maxMinor: 24000, currency: 'CHF' },
        },
        { title: 'Ölwechsel', category: 'MAINTENANCE', priceBand: { minMinor: 12000, maxMinor: 12000, currency: 'CHF' } },
        { title: 'Luftfilter tauschen' },
      ],
    },
  });
  assert.equal(created.status, 201);
  const id = created.body.data.id;

  const detail = await call('GET', `/api/v1/approval-cases/${id}`, { role: 'SERVICE_ADVISOR' });
  assert.equal(detail.status, 200);
  const items = detail.body.data.items;
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((i: { title: string }) => i.title),
    ['Bremsbeläge vorne ersetzen', 'Ölwechsel', 'Luftfilter tauschen'],
  );
  // Block 24: category + description round-trip per position.
  assert.deepEqual(
    items.map((i: { category: string }) => i.category),
    ['SAFETY', 'MAINTENANCE', 'REPAIR'],
  );
  assert.equal(items[0].description, 'Beläge unter Verschleissgrenze.');
});
