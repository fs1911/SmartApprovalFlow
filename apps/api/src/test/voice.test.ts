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

test('POST /voice/transcribe: mock transcript → parsed draft', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('POST', '/api/v1/voice/transcribe', {
    role: 'SERVICE_ADVISOR',
    payload: {
      mockTranscript:
        'Bremsbeläge vorne ersetzen, kostet zwischen 180 und 240 Franken. Das ist dringend.',
    },
  });
  assert.equal(res.status, 200);
  const data = res.body.data;
  assert.equal(data.provider, 'mock');
  assert.ok(data.transcript.includes('Bremsbeläge'));
  assert.equal(data.draft.urgency, 'HIGH');
  assert.equal(data.draft.items[0].title, 'Bremsbeläge vorne ersetzen');
  assert.deepEqual(data.draft.items[0].priceBand, {
    minMinor: 18000,
    maxMinor: 24000,
    currency: 'CHF',
  });
  assert.ok(typeof data.id === 'string' && data.id.length > 0, 'capture is persisted');
});

test('POST /voice/transcribe: empty body is rejected (422)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('POST', '/api/v1/voice/transcribe', {
    role: 'SERVICE_ADVISOR',
    payload: {},
  });
  assert.equal(res.status, 422);
});

test('POST /voice/transcribe: a VIEWER is forbidden (403)', async (t) => {
  if (!dbUp) return t.skip('no database');
  const res = await call('POST', '/api/v1/voice/transcribe', {
    role: 'VIEWER',
    payload: { mockTranscript: 'Ölwechsel für 120 Franken' },
  });
  assert.equal(res.status, 403);
});
