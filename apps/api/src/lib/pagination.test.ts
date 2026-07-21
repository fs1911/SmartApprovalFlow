import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeCursor, decodeCursor } from './pagination.js';

test('cursor round-trips', () => {
  const c = { createdAt: new Date().toISOString(), id: 'abc-123' };
  const encoded = encodeCursor(c);
  assert.deepEqual(decodeCursor(encoded), c);
});

test('decodeCursor returns null for garbage', () => {
  assert.equal(decodeCursor('not-a-cursor'), null);
  assert.equal(decodeCursor(undefined), null);
  assert.equal(decodeCursor(Buffer.from('{"foo":1}').toString('base64url')), null);
});
