/**
 * Transcription provider seam for voice capture (Block 21).
 *
 * Mirrors the other provider adapters (billing/storage/notifications): a small
 * interface with a working `mock` provider that needs no account, plus a
 * `whisper` placeholder that activates once a real speech-to-text backend is
 * wired. Choosing `whisper` without a key degrades safely to `mock`.
 *
 * The whole voice flow is therefore exercisable locally + in tests with zero
 * external credentials. See docs/voice-and-capture.md.
 */
import { config } from '../config.js';

export interface TranscriptionInput {
  /** Base64-encoded audio (real providers). */
  audioBase64?: string;
  contentType?: string;
  durationSec?: number;
  /** Dev/mock convenience: the transcript text itself. */
  mockTranscript?: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  durationSec?: number;
}

export interface TranscriptionProvider {
  readonly name: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

/** Deterministic sample so the flow works even without a dictated transcript. */
export const SAMPLE_TRANSCRIPT =
  'Bremsbeläge vorne ersetzen, kostet zwischen 180 und 240 Franken. ' +
  'Außerdem Ölwechsel für 120 CHF. Das ist sicherheitsrelevant.';

class MockTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'mock';
  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    // Use the supplied transcript; fall back to the sample so a bare audio
    // upload (which we cannot really transcribe here) still yields a draft.
    const text = (input.mockTranscript ?? '').trim() || SAMPLE_TRANSCRIPT;
    return { text, language: 'de', durationSec: input.durationSec };
  }
}

class UnconfiguredWhisperProvider implements TranscriptionProvider {
  readonly name = 'whisper';
  async transcribe(): Promise<TranscriptionResult> {
    // TODO PROVIDER SETUP — POST the audio to the speech-to-text API using
    // config.VOICE_PROVIDER_API_KEY and map its response to TranscriptionResult.
    throw new Error(
      'VOICE_PROVIDER=whisper is selected but not implemented yet (placeholder). Use the mock provider locally.',
    );
  }
}

/**
 * Decide the effective provider. `whisper` without a key degrades to `mock`
 * (with a warning). Pure → unit-testable.
 */
export function resolveVoiceProviderName(
  cfg = { provider: config.VOICE_PROVIDER, hasKey: !!config.VOICE_PROVIDER_API_KEY },
): 'mock' | 'whisper' {
  if (cfg.provider === 'whisper') {
    if (cfg.hasKey) return 'whisper';
    // eslint-disable-next-line no-console
    console.warn(
      '⚠️  VOICE_PROVIDER=whisper but VOICE_PROVIDER_API_KEY is missing — using mock transcription.',
    );
    return 'mock';
  }
  return 'mock';
}

let cached: TranscriptionProvider | null = null;
export function getTranscriptionProvider(): TranscriptionProvider {
  if (cached) return cached;
  cached =
    resolveVoiceProviderName() === 'whisper'
      ? new UnconfiguredWhisperProvider()
      : new MockTranscriptionProvider();
  return cached;
}
