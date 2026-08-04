import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config, isLocalUrl, productionConfigWarnings } from './config.js';

// Block 30: the production config guard should flag go-live mistakes.

test('isLocalUrl detects local hosts', () => {
  assert.equal(isLocalUrl('http://localhost:3000'), true);
  assert.equal(isLocalUrl('http://127.0.0.1:4000'), true);
  assert.equal(isLocalUrl('http://0.0.0.0'), true);
  assert.equal(isLocalUrl('https://app.example.com'), false);
});

test('productionConfigWarnings flags localhost base URLs', () => {
  const warnings = productionConfigWarnings({
    ...config,
    WEB_BASE_URL: 'http://localhost:3000',
    API_BASE_URL: 'http://localhost:4000',
  });
  assert.ok(warnings.some((w) => w.includes('WEB_BASE_URL')));
  assert.ok(warnings.some((w) => w.includes('API_BASE_URL')));
});

test('productionConfigWarnings is quiet for real base URLs', () => {
  const warnings = productionConfigWarnings({
    ...config,
    EMAIL_PROVIDER: 'resend',
    STORAGE_DRIVER: 'supabase',
    BILLING_WEBHOOK_SECRET: 'whsec_live_real',
    WEB_BASE_URL: 'https://app.example.com',
    API_BASE_URL: 'https://api.example.com',
  });
  assert.equal(
    warnings.some((w) => w.includes('BASE_URL')),
    false,
  );
});
