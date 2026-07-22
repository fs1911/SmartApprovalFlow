import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password.js';
import { signSession, verifySession } from './jwt.js';
import { generateApiKey, hashApiKey, parseScopes, apiKeyHasPermission } from './api-keys.js';
import { signPayload, verifySignature, backoffSeconds } from './webhooks.js';

test('password: hash verifies, wrong password fails', async () => {
  const hash = await hashPassword('correct horse');
  assert.ok(hash.startsWith('scrypt$'));
  assert.equal(await verifyPassword('correct horse', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
  assert.equal(await verifyPassword('x', null), false);
});

test('jwt: session round-trips and rejects tampered tokens', async () => {
  const token = await signSession({ sub: 'user-1', tenantId: 'tenant-1' });
  const claims = await verifySession(token);
  assert.equal(claims?.sub, 'user-1');
  assert.equal(claims?.tenantId, 'tenant-1');
  assert.equal(await verifySession('not.a.jwt'), null);
  assert.equal(await verifySession(token + 'x'), null);
});

test('api keys: prefix format, deterministic hash, scope parsing', () => {
  const k = generateApiKey('live');
  assert.match(k.raw, /^saf_live_[0-9a-f]{8}_/);
  assert.ok(k.raw.startsWith(k.prefix));
  assert.equal(hashApiKey(k.raw), k.keyHash);
  assert.notEqual(k.keyHash, k.raw); // stored value is the hash, not the secret

  const scopes = parseScopes('cases:read cases:send not-a-real-scope templates:read');
  assert.deepEqual(scopes, ['cases:read', 'cases:send', 'templates:read']);
  assert.equal(apiKeyHasPermission('cases:read cases:send', 'cases:send'), true);
  assert.equal(apiKeyHasPermission('cases:read', 'cases:create'), false);
});

test('webhooks: signature verifies, backoff grows and is capped', () => {
  const sig = signPayload('secret', '{"a":1}');
  assert.match(sig, /^sha256=[0-9a-f]{64}$/);
  assert.equal(verifySignature('secret', '{"a":1}', sig), true);
  assert.equal(verifySignature('secret', '{"a":2}', sig), false);
  assert.equal(verifySignature('other', '{"a":1}', sig), false);

  assert.ok(backoffSeconds(2) > backoffSeconds(1));
  assert.equal(backoffSeconds(20), 30 * 60); // capped at 30 minutes
});
