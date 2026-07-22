import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEmailProviderName } from './notifications.js';
import { resolveStorageDriverName } from './storage.js';

test('email provider: console by default, resend only with a key', () => {
  assert.equal(resolveEmailProviderName({ provider: 'console', hasResendKey: false }), 'console');
  assert.equal(resolveEmailProviderName({ provider: 'resend', hasResendKey: true }), 'resend');
  // resend selected without a key degrades to console (never a silent no-op)
  assert.equal(resolveEmailProviderName({ provider: 'resend', hasResendKey: false }), 'console');
  // smtp is reserved but not implemented
  assert.equal(resolveEmailProviderName({ provider: 'smtp', hasResendKey: false }), 'console');
});

test('storage driver: local by default, cloud only with credentials', () => {
  assert.equal(
    resolveStorageDriverName({ driver: 'local', hasSupabase: false, hasR2: false }),
    'local',
  );
  assert.equal(
    resolveStorageDriverName({ driver: 'supabase', hasSupabase: true, hasR2: false }),
    'supabase',
  );
  assert.equal(
    resolveStorageDriverName({ driver: 'r2', hasSupabase: false, hasR2: true }),
    'r2',
  );
  // cloud selected without credentials degrades to local
  assert.equal(
    resolveStorageDriverName({ driver: 'supabase', hasSupabase: false, hasR2: false }),
    'local',
  );
  assert.equal(
    resolveStorageDriverName({ driver: 'r2', hasSupabase: false, hasR2: false }),
    'local',
  );
});
