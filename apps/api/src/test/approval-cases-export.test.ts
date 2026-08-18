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

const DEV = { 'x-saf-tenant': 'muster-garage', 'x-saf-role': 'OWNER' };

/** Split a CSV export into non-empty rows (header first). */
function rows(body: string): string[] {
  return body.split('\r\n').filter((l) => l.length > 0);
}

test('case export returns text/csv with the expected header and filename', async (t) => {
  if (!dbUp) return t.skip('no database');
  const app = await getApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/approval-cases/export.csv',
    headers: DEV,
  });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'] as string, /text\/csv/);
  assert.match(
    res.headers['content-disposition'] as string,
    /attachment; filename="klarwerk-cases-.*\.csv"/,
  );
  assert.equal(
    rows(res.body as string)[0],
    'reference,subject,customer,vehicle,status,urgency,assignee,items,createdAt,sentAt,respondedAt,expiresAt',
  );
});

test('case export honours the urgency filter (every data row is HIGH)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const app = await getApp();
  const all = await app.inject({
    method: 'GET',
    url: '/api/v1/approval-cases/export.csv',
    headers: DEV,
  });
  const high = await app.inject({
    method: 'GET',
    url: '/api/v1/approval-cases/export.csv?urgency=HIGH',
    headers: DEV,
  });
  assert.equal(high.statusCode, 200);
  const allData = rows(all.body as string).slice(1);
  const highData = rows(high.body as string).slice(1);
  // Filtering can only narrow the set.
  assert.ok(highData.length <= allData.length);
  // The urgency column (index 5) is unique to urgency values, so a `,HIGH,`
  // token proves the row carries that urgency.
  for (const line of highData) {
    assert.ok(line.includes(',HIGH,'), `expected HIGH urgency in: ${line}`);
  }
});

test('case export rejects an invalid enum filter with 422 (Zod)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/approval-cases/export.csv?urgency=NOPE', {
    role: 'OWNER',
  });
  assert.equal(res.status, 422);
});

test('case export is gated on cases:read — a read-only VIEWER may export', async (t) => {
  if (!dbUp) return t.skip('no database');
  const app = await getApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/approval-cases/export.csv',
    headers: { 'x-saf-tenant': 'muster-garage', 'x-saf-role': 'VIEWER' },
  });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'] as string, /text\/csv/);
});
