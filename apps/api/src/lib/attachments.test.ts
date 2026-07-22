import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateItemDecisions } from './status.js';
import { buildAttachmentKey, isAllowedAttachmentType } from './storage.js';

test('aggregate: all approve → APPROVED', () => {
  assert.equal(aggregateItemDecisions(['APPROVE', 'APPROVE']), 'APPROVED');
});

test('aggregate: all decline → DECLINED', () => {
  assert.equal(aggregateItemDecisions(['DECLINE', 'DECLINE']), 'DECLINED');
});

test('aggregate: mix of approve and decline → PARTIALLY_APPROVED', () => {
  assert.equal(aggregateItemDecisions(['APPROVE', 'DECLINE']), 'PARTIALLY_APPROVED');
});

test('aggregate: any callback wins (non-terminal)', () => {
  assert.equal(aggregateItemDecisions(['APPROVE', 'CALLBACK', 'DECLINE']), 'CALLBACK');
  assert.equal(aggregateItemDecisions(['CALLBACK']), 'CALLBACK');
});

test('attachment key is tenant/case scoped and URL-safe', () => {
  const key = buildAttachmentKey('t-1', 'c-2', 'Bremsen VORNE (links).JPG');
  assert.match(key, /^tenants\/t-1\/cases\/c-2\/[0-9a-f-]{36}-/);
  // No spaces, no parens, no uppercase, no traversal.
  assert.ok(!/[ ()]/.test(key));
  assert.ok(!key.includes('..'));
  assert.equal(key, key.toLowerCase());
});

test('only image content types are allowed', () => {
  assert.equal(isAllowedAttachmentType('image/jpeg'), true);
  assert.equal(isAllowedAttachmentType('image/png'), true);
  assert.equal(isAllowedAttachmentType('image/webp'), true);
  assert.equal(isAllowedAttachmentType('application/pdf'), false);
  assert.equal(isAllowedAttachmentType('text/html'), false);
});
