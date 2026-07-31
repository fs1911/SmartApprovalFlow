import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVoiceProviderName, SAMPLE_TRANSCRIPT, WhisperProvider } from './voice.js';

test('resolveVoiceProviderName defaults to mock', () => {
  assert.equal(resolveVoiceProviderName({ provider: 'mock', hasKey: false }), 'mock');
  assert.equal(resolveVoiceProviderName({ provider: 'mock', hasKey: true }), 'mock');
});

test('resolveVoiceProviderName: whisper without a key degrades to mock', () => {
  assert.equal(resolveVoiceProviderName({ provider: 'whisper', hasKey: false }), 'mock');
});

test('resolveVoiceProviderName: whisper with a key selects whisper', () => {
  assert.equal(resolveVoiceProviderName({ provider: 'whisper', hasKey: true }), 'whisper');
});

test('a non-empty sample transcript exists for the mock fallback', () => {
  assert.ok(SAMPLE_TRANSCRIPT.length > 0);
});

test('WhisperProvider rejects a request without audio (no network call)', async () => {
  const provider = new WhisperProvider('test-key', 'https://stt.invalid/x', 'whisper-1');
  await assert.rejects(() => provider.transcribe({ mockTranscript: 'ignored' }), /requires audio/);
});
