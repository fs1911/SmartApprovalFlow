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

test('reporting summary honours the period filter and returns insights', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/reporting/summary?period=90d', { role: 'OWNER' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.period.preset, '90d');
  assert.equal(typeof res.body.data.approvalRate === 'number' || res.body.data.approvalRate === null, true);
  // Block 50: engagement / response rate.
  assert.ok(res.body.data.engagement);
  assert.equal(typeof res.body.data.engagement.reached, 'number');
  assert.equal(typeof res.body.data.engagement.responded, 'number');
  assert.equal(
    typeof res.body.data.engagement.rate === 'number' || res.body.data.engagement.rate === null,
    true,
  );
  assert.ok(res.body.data.revenue);
  assert.equal(typeof res.body.data.revenue.minMinor, 'number');
  assert.ok(Array.isArray(res.body.data.trend.buckets));
  assert.ok('median' in res.body.data.responseHours);
  // Block 25: positions-by-category breakdown.
  assert.ok(Array.isArray(res.body.data.categories));
  for (const c of res.body.data.categories) {
    assert.equal(typeof c.category, 'string');
    assert.equal(typeof c.count, 'number');
    assert.equal(typeof c.display, 'string');
  }
  // Block 43: cases-by-urgency distribution.
  assert.ok(Array.isArray(res.body.data.urgencies));
  const urgencyKeys = res.body.data.urgencies.map((u: { urgency: string }) => u.urgency);
  for (const u of res.body.data.urgencies) {
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(u.urgency));
    assert.equal(typeof u.count, 'number');
    assert.ok(u.count > 0); // occurring-only
  }
  // Most-urgent-first ordering (subsequence of HIGH, MEDIUM, LOW).
  const order = ['HIGH', 'MEDIUM', 'LOW'];
  const positions = urgencyKeys.map((k: string) => order.indexOf(k));
  const sorted = [...positions].sort((a: number, b: number) => a - b);
  assert.deepEqual(positions, sorted, 'urgencies are in canonical order');
  // Block 45: response-time distribution — always four fixed bins in order,
  // summing to the responded-cases count.
  const buckets = res.body.data.responseBuckets;
  assert.ok(Array.isArray(buckets));
  assert.deepEqual(
    buckets.map((b: { bucket: string }) => b.bucket),
    ['under1h', 'under1d', 'under3d', 'over3d'],
  );
  const bucketSum = buckets.reduce((n: number, b: { count: number }) => n + b.count, 0);
  assert.equal(bucketSum, res.body.data.responseHours.count);
});

test('reporting summary accepts an explicit from/to range', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/reporting/summary?from=2026-01-01&to=2026-12-31', { role: 'OWNER' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.period.preset, 'custom');
});

test('CSV export returns text/csv with a header row and attachment filename', async (t) => {
  if (!dbUp) return t.skip('no database');
  const app = await getApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/reporting/export.csv?period=365d',
    headers: { 'x-saf-tenant': 'muster-garage', 'x-saf-role': 'OWNER' },
  });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'] as string, /text\/csv/);
  assert.match(res.headers['content-disposition'] as string, /attachment; filename="saf-report-.*\.csv"/);
  const body = res.body as string;
  assert.match(body.split('\r\n')[0]!, /^reference,subject,customer,status/);
});

test('reporting requires reporting:read (TECHNICIAN forbidden)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/reporting/summary', { role: 'TECHNICIAN' });
  assert.equal(res.status, 403);
});
