import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retentionCutoffs, type RetentionPolicy } from './retention.js';
import { resolveMonitorName } from './monitoring.js';

const policy: RetentionPolicy = { webhookDays: 30, orphanAttachmentHours: 24, caseMonths: 0 };
const now = new Date('2026-06-01T00:00:00Z');

test('retention cutoffs are computed from now minus the policy windows', () => {
  const c = retentionCutoffs(policy, now);
  assert.equal(c.webhookBefore.toISOString(), '2026-05-02T00:00:00.000Z'); // 30 days
  assert.equal(c.orphanAttachmentBefore.toISOString(), '2026-05-31T00:00:00.000Z'); // 24 h
  assert.equal(c.idempotencyExpiredBefore.toISOString(), now.toISOString());
});

test('zero windows collapse the cutoff to now', () => {
  const c = retentionCutoffs({ webhookDays: 0, orphanAttachmentHours: 0, caseMonths: 0 }, now);
  assert.equal(c.webhookBefore.toISOString(), now.toISOString());
  assert.equal(c.orphanAttachmentBefore.toISOString(), now.toISOString());
});

test('monitoring resolves to noop unless a backend + DSN are configured', () => {
  assert.equal(resolveMonitorName({ provider: 'none', hasDsn: false }), 'noop');
  assert.equal(resolveMonitorName({ provider: 'none', hasDsn: true }), 'noop');
  // Selected backend without a DSN degrades to noop rather than crashing.
  assert.equal(resolveMonitorName({ provider: 'sentry', hasDsn: false }), 'noop');
  assert.equal(resolveMonitorName({ provider: 'http', hasDsn: true }), 'http');
});
