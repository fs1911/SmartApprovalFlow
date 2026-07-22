import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, call, dbAvailable } from './helpers.js';

let dbUp = false;
before(async () => {
  dbUp = await dbAvailable();
});
after(async () => {
  const app = await getApp();
  await app.close();
});

/** Post JSON without auth (loginless endpoints). */
async function post(url: string, payload: unknown) {
  const app = await getApp();
  const res = await app.inject({ method: 'POST', url, payload: payload as object });
  let body: any = null;
  try {
    body = res.json();
  } catch {
    body = res.body;
  }
  return { status: res.statusCode, body };
}

const uniqueEmail = () => `invitee_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;

test('onboarding checklist is returned with activation signals', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('GET', '/api/v1/onboarding', { role: 'OWNER' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.totalCount, 5);
  assert.equal(typeof res.body.data.activated, 'boolean');
  assert.ok(Array.isArray(res.body.data.steps));
});

test('invite → accept → login end to end', async (t) => {
  if (!dbUp) return t.skip('no database');
  const email = uniqueEmail();

  // OWNER invites a SERVICE_ADVISOR; dev returns the acceptUrl.
  const invite = await call('POST', '/api/v1/invitations', {
    role: 'OWNER',
    payload: { email, role: 'SERVICE_ADVISOR' },
  });
  assert.equal(invite.status, 201);
  const acceptUrl: string = invite.body.data.acceptUrl;
  assert.ok(acceptUrl, 'dev acceptUrl present');
  const token = acceptUrl.split('/invite/')[1];

  // Accept + set password → returns a session.
  const accepted = await post('/api/v1/invitations/accept', { token, name: 'Neue Kollegin', password: 'geheim1234' });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.data.role, 'SERVICE_ADVISOR');
  assert.ok(accepted.body.data.token);

  // The new member can now log in.
  const login = await post('/api/v1/auth/login', { email, password: 'geheim1234' });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.user.email, email);

  // The token is single-use: a second accept fails.
  const replay = await post('/api/v1/invitations/accept', { token, password: 'anders9999' });
  assert.equal(replay.status, 404);
  assert.equal(replay.body.error.code, 'TOKEN_INVALID');
});

test('VIEWER cannot invite (RBAC)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('POST', '/api/v1/invitations', {
    role: 'VIEWER',
    payload: { email: uniqueEmail(), role: 'TECHNICIAN' },
  });
  assert.equal(res.status, 403);
});

test('forgot-password is uniform (no user enumeration) and reset requires a valid token', async (t) => {
  if (!dbUp) return t.skip('no database');
  // Unknown e-mail still returns ok.
  const unknown = await post('/api/v1/auth/forgot-password', { email: 'nobody@nowhere.example' });
  assert.equal(unknown.status, 200);
  assert.equal(unknown.body.data.ok, true);

  // Known seed user also returns ok (same shape).
  const known = await post('/api/v1/auth/forgot-password', { email: 'owner@muster-garage.ch' });
  assert.equal(known.status, 200);

  // A bogus reset token is rejected.
  const bad = await post('/api/v1/auth/reset-password', { token: 'not-a-real-token-xxxx', password: 'whatever1234' });
  assert.equal(bad.status, 404);
  assert.equal(bad.body.error.code, 'TOKEN_INVALID');
});
