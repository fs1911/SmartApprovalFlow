import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, call, dbAvailable } from './helpers.js';
import { signBillingPayload } from '../lib/billing.js';

let dbUp = false;
before(async () => {
  dbUp = await dbAvailable();
});
after(async () => {
  // Restore the demo tenant to PRO so other suites are never blocked by limits.
  if (dbUp) await call('POST', '/api/v1/billing/change-plan', { role: 'OWNER', payload: { planKey: 'PRO' } });
  const app = await getApp();
  await app.close();
});

test('GET /billing returns plan, usage and available plans', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/billing', { role: 'OWNER' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.subscription.planKey);
  assert.equal(typeof res.body.data.usage.cases.withinLimit, 'boolean');
  assert.equal(res.body.data.plans.length, 3);
});

test('change-plan applies immediately (mock) and is reflected; VIEWER is forbidden', async (t) => {
  if (!dbUp) return t.skip('no database');
  const forbidden = await call('POST', '/api/v1/billing/change-plan', { role: 'VIEWER', payload: { planKey: 'STARTER' } });
  assert.equal(forbidden.status, 403);

  const change = await call('POST', '/api/v1/billing/change-plan', { role: 'OWNER', payload: { planKey: 'STARTER' } });
  assert.equal(change.status, 200);
  assert.equal(change.body.data.applied, true);

  const after = await call('GET', '/api/v1/billing', { role: 'OWNER' });
  assert.equal(after.body.data.subscription.planKey, 'STARTER');
  // STARTER caps cases at 100 — the limit is now a concrete number, not null.
  assert.equal(after.body.data.usage.cases.limit, 100);
});

test('billing webhook verifies the signature and applies the plan (idempotent)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const app = await getApp();
  // Discover the demo tenantId via the dev context (call GET /billing includes it indirectly).
  // Use the auth/session endpoint to read the tenantId.
  const session = await call('GET', '/api/v1/auth/session', { role: 'OWNER' });
  const tenantId = session.body.data.tenant.id;

  const event = { id: `evt_${Date.now()}`, type: 'subscription.updated', tenantId, planKey: 'PRO' };
  const raw = JSON.stringify(event);
  const sig = signBillingPayload('whsec_dev_billing', raw);

  const bad = await app.inject({
    method: 'POST',
    url: '/api/v1/billing/webhook',
    headers: { 'content-type': 'application/json', 'x-saf-billing-signature': 'sha256=deadbeef' },
    payload: raw,
  });
  assert.equal(bad.statusCode, 422);

  const good = await app.inject({
    method: 'POST',
    url: '/api/v1/billing/webhook',
    headers: { 'content-type': 'application/json', 'x-saf-billing-signature': sig },
    payload: raw,
  });
  assert.equal(good.statusCode, 200);
  assert.equal(good.json().data.planKey, 'PRO');

  // Idempotent replay: same event id → same 200, no double-apply error.
  const replay = await app.inject({
    method: 'POST',
    url: '/api/v1/billing/webhook',
    headers: { 'content-type': 'application/json', 'x-saf-billing-signature': sig },
    payload: raw,
  });
  assert.equal(replay.statusCode, 200);
});
