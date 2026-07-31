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

/**
 * Real speech-to-text adapter against an OpenAI-compatible
 * `/audio/transcriptions` endpoint. Encapsulated but **deactivated** by default:
 * it is only ever constructed when VOICE_PROVIDER=whisper AND a key is present
 * (see resolveVoiceProviderName + getTranscriptionProvider), so locally and in
 * CI the mock provider is used and this code path is never hit.
 *
 * TODO PROVIDER SETUP — set VOICE_PROVIDER=whisper + VOICE_PROVIDER_API_KEY
 * (optionally VOICE_PROVIDER_URL / VOICE_PROVIDER_MODEL) and verify against your
 * chosen backend before enabling in production.
 */
export class WhisperProvider implements TranscriptionProvider {
  readonly name = 'whisper';
  constructor(
    private readonly apiKey: string,
    private readonly url: string,
    private readonly model: string,
  ) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (!input.audioBase64) {
      throw new Error('whisper provider requires audio (audioBase64 was empty).');
    }
    const bytes = new Uint8Array(Buffer.from(input.audioBase64, 'base64'));
    const form = new FormData();
    form.append('model', this.model);
    form.append('file', new Blob([bytes], { type: input.contentType ?? 'audio/webm' }), 'audio.webm');

    const res = await fetch(this.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`whisper transcription failed (HTTP ${res.status}): ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as { text?: string; language?: string };
    return {
      text: (json.text ?? '').trim(),
      language: json.language ?? 'de',
      durationSec: input.durationSec,
    };
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
      ? new WhisperProvider(
          config.VOICE_PROVIDER_API_KEY!,
          config.VOICE_PROVIDER_URL,
          config.VOICE_PROVIDER_MODEL,
        )
      : new MockTranscriptionProvider();
  return cached;
}
