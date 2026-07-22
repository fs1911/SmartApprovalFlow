import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeOnboarding, type OnboardingSignals } from './onboarding.js';
import { isTokenValid, expiryFromHours } from './verification.js';

const empty: OnboardingSignals = {
  hasBranding: false,
  hasTeam: false,
  hasCase: false,
  hasSentCase: false,
  hasResponse: false,
};

test('a fresh workspace has no steps done and points at branding first', () => {
  const o = computeOnboarding(empty);
  assert.equal(o.completedCount, 0);
  assert.equal(o.totalCount, 5);
  assert.equal(o.complete, false);
  assert.equal(o.activated, false);
  assert.equal(o.nextStep?.key, 'branding');
});

test('a fully set-up workspace is complete and activated', () => {
  const o = computeOnboarding({
    hasBranding: true,
    hasTeam: true,
    hasCase: true,
    hasSentCase: true,
    hasResponse: true,
  });
  assert.equal(o.complete, true);
  assert.equal(o.nextStep, null);
  assert.equal(o.activated, true);
});

test('activation requires both a sent case and a response', () => {
  assert.equal(computeOnboarding({ ...empty, hasSentCase: true }).activated, false);
  assert.equal(computeOnboarding({ ...empty, hasResponse: true }).activated, false);
  assert.equal(
    computeOnboarding({ ...empty, hasSentCase: true, hasResponse: true }).activated,
    true,
  );
});

test('nextStep advances as earlier steps complete', () => {
  const o = computeOnboarding({ ...empty, hasBranding: true });
  assert.equal(o.completedCount, 1);
  assert.equal(o.nextStep?.key, 'team');
});

test('token validity: fresh valid, consumed/revoked/expired invalid', () => {
  const now = new Date('2026-06-01T00:00:00Z');
  const future = expiryFromHours(2, now);
  assert.equal(isTokenValid({ expiresAt: future }, now), true);
  assert.equal(isTokenValid({ expiresAt: future, consumedAt: now }, now), false);
  assert.equal(isTokenValid({ expiresAt: future, revokedAt: now }, now), false);
  const past = new Date('2026-05-01T00:00:00Z');
  assert.equal(isTokenValid({ expiresAt: past }, now), false);
});
