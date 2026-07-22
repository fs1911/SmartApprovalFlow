import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesEventAllowlist } from './webhooks.js';

test('empty allowlist matches every event', () => {
  assert.equal(matchesEventAllowlist('', 'approval_case.approved'), true);
  assert.equal(matchesEventAllowlist('   ', 'approval_case.sent'), true);
});

test('a specific allowlist matches only listed events', () => {
  const list = 'approval_case.approved approval_case.declined';
  assert.equal(matchesEventAllowlist(list, 'approval_case.approved'), true);
  assert.equal(matchesEventAllowlist(list, 'approval_case.declined'), true);
  assert.equal(matchesEventAllowlist(list, 'approval_case.sent'), false);
});

test('extra whitespace between entries is tolerated', () => {
  assert.equal(matchesEventAllowlist('  a   b  ', 'b'), true);
  assert.equal(matchesEventAllowlist('  a   b  ', 'c'), false);
});
