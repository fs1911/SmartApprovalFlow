import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLimit } from '@saf/types';
import { monthPeriod } from './usage.js';
import { resolveBillingProviderName, signBillingPayload, verifyBillingSignature } from './billing.js';

test('evaluateLimit: unlimited is always within, never warns', () => {
  const s = evaluateLimit(9999, null);
  assert.equal(s.withinLimit, true);
  assert.equal(s.softWarning, false);
  assert.equal(s.remaining, null);
});

test('evaluateLimit: under, soft threshold, and at/over the hard limit', () => {
  assert.deepEqual(evaluateLimit(3, 10), { limit: 10, used: 3, remaining: 7, withinLimit: true, softWarning: false });
  // 80% of 10 = 8 → soft warning, still within.
  const soft = evaluateLimit(8, 10);
  assert.equal(soft.withinLimit, true);
  assert.equal(soft.softWarning, true);
  // At the limit → blocked.
  const at = evaluateLimit(10, 10);
  assert.equal(at.withinLimit, false);
  assert.equal(at.remaining, 0);
  // Over the limit → blocked.
  assert.equal(evaluateLimit(11, 10).withinLimit, false);
});

test('monthPeriod spans the calendar month containing now (UTC)', () => {
  const p = monthPeriod(new Date('2026-03-15T12:00:00Z'));
  assert.equal(p.start.toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(p.end.toISOString(), '2026-04-01T00:00:00.000Z');
});

test('billing provider resolves to mock unless stripe + key are present', () => {
  assert.equal(resolveBillingProviderName({ provider: 'mock', hasStripeKey: false }), 'mock');
  assert.equal(resolveBillingProviderName({ provider: 'stripe', hasStripeKey: false }), 'mock');
  assert.equal(resolveBillingProviderName({ provider: 'stripe', hasStripeKey: true }), 'stripe');
});

test('billing webhook signature round-trips and rejects tampering', () => {
  const secret = 'whsec_test';
  const payload = JSON.stringify({ id: 'evt_1', type: 'subscription.updated', tenantId: 't', planKey: 'PRO' });
  const sig = signBillingPayload(secret, payload);
  assert.equal(verifyBillingSignature(secret, payload, sig), true);
  assert.equal(verifyBillingSignature(secret, payload + 'x', sig), false);
  assert.equal(verifyBillingSignature('wrong', payload, sig), false);
  assert.equal(verifyBillingSignature(secret, payload, 'sha256=deadbeef'), false);
});
