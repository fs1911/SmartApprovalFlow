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

// Block 34: each saved view reports matchCount — how many cases currently match
// its filters, using the exact same filter logic as the case list.

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function countFor(viewId: string): Promise<number> {
  const listed = await call('GET', '/api/v1/saved-views', { role: 'OWNER' });
  const view = (listed.body.data.views as { id: string; matchCount: number }[]).find(
    (v) => v.id === viewId,
  );
  assert.ok(view, 'view is present in the list');
  return view.matchCount;
}

async function createCase(urgency: string, category: string): Promise<void> {
  const res = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    payload: {
      subject: uniqueName('Zähl-Fall'),
      urgency,
      customer: { name: 'Zählkunde', phone: '+41 79 000 00 00' },
      items: [{ title: 'Testposition', category }],
    },
  });
  assert.equal(res.status, 201);
}

test('matchCount is a number and no-filter view >= a filtered view', async (t) => {
  if (!dbUp) return t.skip('no database');
  const all = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Cnt-Alle') },
  });
  const high = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Cnt-Hoch'), filters: { urgency: 'HIGH' } },
  });
  const allCount = await countFor(all.body.data.id);
  const highCount = await countFor(high.body.data.id);
  assert.equal(typeof allCount, 'number');
  assert.equal(typeof highCount, 'number');
  assert.ok(allCount >= highCount, 'a view without filters counts at least as many cases');
});

test('matchCount tracks the urgency filter when a matching case is added', async (t) => {
  if (!dbUp) return t.skip('no database');
  const view = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Cnt-Urg'), filters: { urgency: 'HIGH' } },
  });
  const id = view.body.data.id as string;
  const before = await countFor(id);
  await createCase('HIGH', 'REPAIR');
  const after = await countFor(id);
  assert.equal(after, before + 1, 'adding a HIGH case increments the HIGH view count');
});

test('matchCount tracks the category filter when a matching case is added', async (t) => {
  if (!dbUp) return t.skip('no database');
  const view = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Cnt-Cat'), filters: { category: 'SAFETY' } },
  });
  const id = view.body.data.id as string;
  const before = await countFor(id);
  await createCase('MEDIUM', 'SAFETY');
  const after = await countFor(id);
  assert.equal(after, before + 1, 'adding a SAFETY case increments the SAFETY view count');
});

test('a non-matching case does not change a filtered view count', async (t) => {
  if (!dbUp) return t.skip('no database');
  const view = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name: uniqueName('Cnt-NoMatch'), filters: { urgency: 'HIGH' } },
  });
  const id = view.body.data.id as string;
  const before = await countFor(id);
  await createCase('LOW', 'REPAIR'); // not HIGH → should not count
  const after = await countFor(id);
  assert.equal(after, before, 'a LOW case leaves the HIGH view count unchanged');
});
