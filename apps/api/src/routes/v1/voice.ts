/**
 * Voice capture (Block 21).
 *
 *   POST /api/v1/voice/transcribe   dictate → transcript → draft (cases:create)
 *
 * The mechanic dictates the extra work; we transcribe it (mock provider by
 * default — no external account) and parse it into a draft that pre-fills the
 * create-case form. The capture is persisted for auditability; retained audio,
 * if any, goes to the storage driver (only its key is stored here).
 *
 * This is an EXTENSION of case creation, not a new flow: the returned draft is
 * advisory and the normal create-case endpoint still validates on submit.
 */
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { voiceTranscribeRequestSchema } from '@saf/types';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { getTranscriptionProvider } from '../../lib/voice.js';
import { parseVoiceDraft } from '../../lib/voice-draft.js';
import { getStorageDriver } from '../../lib/storage.js';

export async function voiceRoutes(app: FastifyInstance) {
  app.post(
    '/voice/transcribe',
    {
      preHandler: app.requirePermission('cases:create'),
      schema: {
        tags: ['voice'],
        summary: 'Transcribe a dictation and return a case draft',
        description:
          'Accepts base64 audio or (with the mock provider) a transcript directly. ' +
          'Returns the transcript plus a parsed draft that pre-fills the create-case form.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const input = voiceTranscribeRequestSchema.parse(req.body);

      // 1) Transcribe (mock unless a real provider is configured).
      const provider = getTranscriptionProvider();
      const result = await provider.transcribe({
        audioBase64: input.audioBase64,
        contentType: input.contentType,
        durationSec: input.durationSec,
        mockTranscript: input.mockTranscript,
      });

      // 2) Parse into an advisory draft (pure, deterministic).
      const draft = parseVoiceDraft(result.text);

      // 3) Best-effort audio retention — never fail the request over storage.
      let audioStorageKey: string | null = null;
      if (input.audioBase64) {
        try {
          const driver = getStorageDriver();
          const ext = input.contentType?.includes('mp4')
            ? 'm4a'
            : input.contentType?.includes('ogg')
              ? 'ogg'
              : 'webm';
          const key = `tenants/${auth.tenantId}/voice/${randomUUID()}.${ext}`;
          await driver.put(key, Buffer.from(input.audioBase64, 'base64'), input.contentType ?? 'audio/webm');
          audioStorageKey = key;
        } catch (err) {
          req.log.warn({ err }, 'voice: audio retention failed (non-fatal)');
        }
      }

      // 4) Persist the capture for auditability.
      const capture = await prisma.voiceCapture.create({
        data: {
          tenantId: auth.tenantId,
          createdById: auth.userId ?? null,
          transcript: result.text,
          provider: provider.name,
          language: result.language,
          durationSec: result.durationSec != null ? Math.round(result.durationSec) : null,
          audioStorageKey,
        },
        select: { id: true },
      });

      return ok({
        id: capture.id,
        transcript: result.text,
        language: result.language,
        durationSec: result.durationSec,
        provider: provider.name,
        draft,
      });
    },
  );
}
