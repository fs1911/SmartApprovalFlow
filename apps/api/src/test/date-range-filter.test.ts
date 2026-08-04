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

/** YYYY-MM-DD (UTC) for `now` shifted by `days`. */
function isoDate(days = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function createCase(subject: string) {
  const res = await call('POST', '/api/v1/approval-cases', {
    role: 'OWNER',
    payload: {
      subject,
      customer: { name: 'Datum Kunde', email: 'd@example.com' },
      items: [{ title: 'Bremsen' }],
    },
  });
  assert.equal(res.status, 201);
}

async function subjectsFor(query: string): Promise<string[]> {
  const res = await call('GET', `/api/v1/approval-cases?limit=100&${query}`, { role: 'OWNER' });
  assert.equal(res.status, 200);
  return (res.body.data as { subject: string }[]).map((c) => c.subject);
}

// Block 31: free createdFrom/createdTo range on GET /approval-cases.

test('createdFrom includes today and excludes future starts', async (t) => {
  if (!dbUp) return t.skip('no database');
  const marker = `RANGE-${Date.now()}`;
  await createCase(marker);

  assert.ok(
    (await subjectsFor(`createdFrom=${isoDate(0)}`)).includes(marker),
    'today is inclusive',
  );
  assert.ok(
    !(await subjectsFor(`createdFrom=${isoDate(1)}`)).includes(marker),
    'a tomorrow lower bound excludes a case created now',
  );
});

test('createdTo includes today and excludes past ends', async (t) => {
  if (!dbUp) return t.skip('no database');
  const marker = `RANGETO-${Date.now()}`;
  await createCase(marker);

  assert.ok((await subjectsFor(`createdTo=${isoDate(0)}`)).includes(marker), 'today is inclusive');
  assert.ok(
    !(await subjectsFor(`createdTo=${isoDate(-1)}`)).includes(marker),
    'a yesterday upper bound excludes a case created now',
  );
});

test('a free range overrides the createdWithin preset', async (t) => {
  if (!dbUp) return t.skip('no database');
  const marker = `RANGEWIN-${Date.now()}`;
  await createCase(marker);

  // createdWithin=7d alone would include the fresh case…
  assert.ok((await subjectsFor(`createdWithin=7d`)).includes(marker));
  // …but a future createdFrom must win and exclude it.
  assert.ok(
    !(await subjectsFor(`createdWithin=7d&createdFrom=${isoDate(1)}`)).includes(marker),
    'free range takes precedence over the preset',
  );
});

test('rejects a malformed date (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const bad = await call('GET', '/api/v1/approval-cases?createdFrom=nope', { role: 'OWNER' });
  assert.equal(bad.status, 422);
});

test('rejects an impossible date (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const bad = await call('GET', '/api/v1/approval-cases?createdTo=2026-13-40', { role: 'OWNER' });
  assert.equal(bad.status, 422);
});

test('a saved view can store and round-trip a free date range', async (t) => {
  if (!dbUp) return t.skip('no database');
  const name = `Zeitraum ${Date.now()}`;
  const created = await call('POST', '/api/v1/saved-views', {
    role: 'OWNER',
    payload: { name, filters: { createdFrom: isoDate(-30), createdTo: isoDate(0) } },
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.data.filters, {
    createdFrom: isoDate(-30),
    createdTo: isoDate(0),
  });
});
