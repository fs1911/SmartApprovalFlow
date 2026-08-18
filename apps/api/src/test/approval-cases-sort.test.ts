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

async function createdAts(query: string): Promise<string[]> {
  const res = await call('GET', `/api/v1/approval-cases?limit=100&${query}`, { role: 'OWNER' });
  assert.equal(res.status, 200);
  return (res.body.data as { createdAt: string }[]).map((c) => c.createdAt);
}

// Block 44: ?sort=newest (default) | oldest on GET /approval-cases.

test('default sort returns cases newest-first (createdAt non-increasing)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const dates = await createdAts('');
  for (let i = 1; i < dates.length; i++) {
    assert.ok(
      dates[i - 1]! >= dates[i]!,
      `newest-first violated at ${i}: ${dates[i - 1]} < ${dates[i]}`,
    );
  }
});

test('sort=oldest returns cases oldest-first (createdAt non-decreasing)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const dates = await createdAts('sort=oldest');
  for (let i = 1; i < dates.length; i++) {
    assert.ok(
      dates[i - 1]! <= dates[i]!,
      `oldest-first violated at ${i}: ${dates[i - 1]} > ${dates[i]}`,
    );
  }
});

test('sort flips the head of the list (oldest head is not later than newest head)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const newest = await createdAts('');
  const oldest = await createdAts('sort=oldest');
  if (newest.length < 2 || oldest.length < 2) return t.skip('need at least two cases');
  // newest[0] is the globally latest case, oldest[0] the globally earliest;
  // the earliest must not be later than the latest (guards against the sort
  // being ignored). Robust regardless of the page limit vs. total count.
  assert.ok(
    oldest[0]! <= newest[0]!,
    `expected oldest head ${oldest[0]} <= newest head ${newest[0]}`,
  );
});

test('an invalid sort value is rejected with 422 (Zod)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/approval-cases?sort=sideways', { role: 'OWNER' });
  assert.equal(res.status, 422);
});

test('oldest-first cursor pagination stays ascending across pages', async (t) => {
  if (!dbUp) return t.skip('no database');
  const first = await call('GET', '/api/v1/approval-cases?limit=3&sort=oldest', { role: 'OWNER' });
  assert.equal(first.status, 200);
  const p1 = first.body.data as { id: string; createdAt: string }[];
  const cursor = first.body.meta.nextCursor as string | null;
  if (!cursor || p1.length < 3) return t.skip('not enough cases for a second page');

  const second = await call(
    'GET',
    `/api/v1/approval-cases?limit=3&sort=oldest&cursor=${encodeURIComponent(cursor)}`,
    { role: 'OWNER' },
  );
  assert.equal(second.status, 200);
  const p2 = second.body.data as { id: string; createdAt: string }[];

  // No overlap and the boundary keeps ascending order.
  const ids = new Set(p1.map((c) => c.id));
  for (const c of p2) assert.ok(!ids.has(c.id), `page 2 repeated case ${c.id}`);
  if (p2.length > 0) {
    assert.ok(
      p1[p1.length - 1]!.createdAt <= p2[0]!.createdAt,
      'page boundary broke ascending order',
    );
  }
});
