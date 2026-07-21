import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, isPending, isExpired, isTerminal } from './status.js';

test('valid transitions are allowed', () => {
  assert.equal(canTransition('DRAFT', 'SENT'), true);
  assert.equal(canTransition('SENT', 'VIEWED'), true);
  assert.equal(canTransition('VIEWED', 'APPROVED'), true);
  assert.equal(canTransition('CALLBACK', 'APPROVED'), true); // callback not terminal
});

test('invalid transitions are rejected', () => {
  assert.equal(canTransition('DRAFT', 'APPROVED'), false); // must be sent first
  assert.equal(canTransition('APPROVED', 'DECLINED'), false); // terminal
  assert.equal(canTransition('DECLINED', 'SENT'), false);
});

test('pending / terminal classification', () => {
  assert.equal(isPending('SENT'), true);
  assert.equal(isPending('CALLBACK'), true);
  assert.equal(isPending('APPROVED'), false);
  assert.equal(isTerminal('EXPIRED'), true);
  assert.equal(isTerminal('SENT'), false);
});

test('expiry only applies to open cases with a past expiry', () => {
  const past = new Date(Date.now() - 1000);
  const future = new Date(Date.now() + 100000);
  assert.equal(isExpired('SENT', past), true);
  assert.equal(isExpired('SENT', future), false);
  assert.equal(isExpired('APPROVED', past), false); // terminal never expires
  assert.equal(isExpired('SENT', null), false);
});
