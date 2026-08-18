import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mean,
  median,
  approvalBreakdown,
  revenueRange,
  itemsByCategory,
  casesByUrgency,
  resolvePeriod,
  makeBuckets,
  pickGranularity,
  countIntoBuckets,
  csvEscape,
  toCsv,
} from './reporting.js';

test('mean and median handle empty and odd/even sets', () => {
  assert.equal(mean([]), null);
  assert.equal(median([]), null);
  assert.equal(mean([2, 4, 6]), 4);
  assert.equal(median([3, 1, 2]), 2); // sorted → [1,2,3]
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test('approvalBreakdown counts outcomes and computes rate over decided', () => {
  const b = approvalBreakdown(['APPROVED', 'APPROVED', 'PARTIALLY_APPROVED', 'DECLINED', 'CALLBACK', 'SENT']);
  assert.equal(b.approved, 2);
  assert.equal(b.partiallyApproved, 1);
  assert.equal(b.declined, 1);
  assert.equal(b.callback, 1);
  // decided = 2 + 1 + 1 = 4; approved-ish = 3 → 75%. CALLBACK/SENT excluded.
  assert.equal(b.approvalRate, 75);
});

test('approvalBreakdown rate is null with no decided cases', () => {
  assert.equal(approvalBreakdown(['SENT', 'CALLBACK']).approvalRate, null);
});

test('revenueRange sums approved positions only', () => {
  const cases = [
    // Fully approved → both items count.
    { status: 'APPROVED', items: [
      { decision: null, priceMinMinor: 1000, priceMaxMinor: 2000 },
      { decision: null, priceMinMinor: 500, priceMaxMinor: 500 },
    ] },
    // Partial → only the APPROVE item counts.
    { status: 'PARTIALLY_APPROVED', items: [
      { decision: 'APPROVE', priceMinMinor: 3000, priceMaxMinor: 4000 },
      { decision: 'DECLINE', priceMinMinor: 9000, priceMaxMinor: 9000 },
    ] },
    // Declined → nothing.
    { status: 'DECLINED', items: [{ decision: 'DECLINE', priceMinMinor: 100, priceMaxMinor: 100 }] },
  ];
  const r = revenueRange(cases);
  assert.equal(r.minMinor, 1000 + 500 + 3000);
  assert.equal(r.maxMinor, 2000 + 500 + 4000);
  assert.equal(r.approvedItems, 3);
});

test('resolvePeriod: presets and explicit range', () => {
  const now = new Date('2026-06-15T00:00:00Z');
  assert.equal(resolvePeriod({ period: '7d' }, now).preset, '7d');
  assert.equal(resolvePeriod({}, now).preset, '30d'); // default
  assert.equal(resolvePeriod({ period: 'bogus' }, now).preset, '30d'); // fallback
  const p = resolvePeriod({ from: '2026-01-01', to: '2026-02-01' }, now);
  assert.equal(p.preset, 'custom');
  assert.equal(p.from.toISOString().slice(0, 10), '2026-01-01');
});

test('bucketing: granularity choice and counting', () => {
  const from = new Date('2026-03-01T00:00:00Z');
  const to = new Date('2026-03-05T12:00:00Z');
  assert.equal(pickGranularity(from, to), 'day');
  const buckets = makeBuckets(from, to, 'day');
  assert.equal(buckets.length, 5); // 1..5 March
  const dates = [
    new Date('2026-03-01T09:00:00Z'),
    new Date('2026-03-01T18:00:00Z'),
    new Date('2026-03-03T10:00:00Z'),
  ];
  assert.deepEqual(countIntoBuckets(dates, buckets), [2, 0, 1, 0, 0]);
  // Long spans switch to weekly buckets.
  assert.equal(pickGranularity(new Date('2026-01-01'), new Date('2026-04-01')), 'week');
});

test('CSV escaping and serialisation', () => {
  assert.equal(csvEscape('plain'), 'plain');
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape('line\nbreak'), '"line\nbreak"');
  const csv = toCsv(['ref', 'note'], [['AC-1', 'ok'], ['AC-2', 'a,b']]);
  assert.equal(csv, 'ref,note\r\nAC-1,ok\r\nAC-2,"a,b"\r\n');
});

test('itemsByCategory: counts + price sums per category, canonical order', () => {
  const stats = itemsByCategory([
    { category: 'REPAIR', priceMinMinor: 5000, priceMaxMinor: 7000 },
    { category: 'SAFETY', priceMinMinor: 18000, priceMaxMinor: 24000 },
    { category: 'SAFETY', priceMinMinor: 2000, priceMaxMinor: 2000 },
    { category: null, priceMinMinor: 1000, priceMaxMinor: 1000 }, // → OTHER
    { category: 'BOGUS' }, // unknown → OTHER
  ]);
  // Canonical order: SAFETY before REPAIR before OTHER; empty categories omitted.
  assert.deepEqual(
    stats.map((s) => [s.category, s.count]),
    [['SAFETY', 2], ['REPAIR', 1], ['OTHER', 2]],
  );
  const safety = stats.find((s) => s.category === 'SAFETY')!;
  assert.deepEqual([safety.minMinor, safety.maxMinor], [20000, 26000]);
});

test('itemsByCategory: empty input yields no rows', () => {
  assert.deepEqual(itemsByCategory([]), []);
});

test('casesByUrgency: counts per urgency, most-urgent-first, occurring only', () => {
  const stats = casesByUrgency([
    { urgency: 'LOW' },
    { urgency: 'HIGH' },
    { urgency: 'LOW' },
    { urgency: null }, // → MEDIUM
    { urgency: 'BOGUS' }, // unknown → MEDIUM
  ]);
  // Canonical order HIGH → MEDIUM → LOW; MEDIUM absorbs null + unknown.
  assert.deepEqual(
    stats.map((s) => [s.urgency, s.count]),
    [['HIGH', 1], ['MEDIUM', 2], ['LOW', 2]],
  );
});

test('casesByUrgency: empty input yields no rows', () => {
  assert.deepEqual(casesByUrgency([]), []);
});
