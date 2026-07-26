import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uniqueRecipients } from './inapp.js';

test('uniqueRecipients dedups and drops nulls', () => {
  assert.deepEqual(uniqueRecipients(['a', 'b', 'a', null, undefined, 'b']), ['a', 'b']);
});

test('uniqueRecipients excludes the actor', () => {
  assert.deepEqual(uniqueRecipients(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(uniqueRecipients(['a', 'a'], 'a'), []);
});

test('uniqueRecipients on empty input is empty', () => {
  assert.deepEqual(uniqueRecipients([null, undefined]), []);
});
