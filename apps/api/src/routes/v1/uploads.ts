/**
 * Local storage upload/download endpoints (Block 8).
 *
 * These back the `local` StorageDriver so the full photo-upload flow works with
 * NO external credentials. They are the dev equivalent of a signed upload URL:
 * possession of the (unguessable, UUID-containing) storage key authorises the
 * PUT/GET — there is no session here, exactly like an S3 pre-signed URL. When a
 * real cloud driver is configured these routes are unused (uploads/downloads go
 * straight to the provider), so they are only registered for the local driver.
 *
 * Security notes:
 *  - The key must already exist as an Attachment row (created by the register
 *    endpoint), so arbitrary writes are rejected.
 *  - Content-type and size are validated again here, defence-in-depth.
 *  - Path traversal is prevented by the driver's pathFor().
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@saf/db';
import { config } from '../../config.js';
import { errors } from '../../lib/errors.js';
import { getStorageDriver, isLocalDriver, isAllowedAttachmentType } from '../../lib/storage.js';

export async function uploadRoutes(app: FastifyInstance) {
  // Only meaningful for the local driver; cloud drivers serve their own URLs.
  if (!isLocalDriver()) return;

  // --- Receive the bytes (step 2 of the two-step upload) -------------------
  app.put(
    '/uploads/local/*',
    {
      // Tighter limit than the global; images only.
      bodyLimit: config.ATTACHMENT_MAX_BYTES,
      schema: {
        tags: ['approval-cases'],
        summary: 'Local storage: receive attachment bytes (dev signed-URL equivalent)',
        description: 'Accepts raw image bytes for a previously-registered attachment key.',
      },
    },
    async (req, reply) => {
      const key = (req.params as Record<string, string>)['*'];
      if (!key) throw errors.notFound('Unbekannter Upload-Key');
      const body = req.body;
      if (!Buffer.isBuffer(body)) {
        throw errors.validation('Erwartet werden binäre Bilddaten (image/*).');
      }

      const contentType = (req.headers['content-type'] as string | undefined)?.split(';')[0]?.trim() ?? '';
      if (!isAllowedAttachmentType(contentType)) {
        throw errors.validation(`Nicht unterstützter Medientyp: ${contentType || 'unbekannt'}.`);
      }
      if (body.length > config.ATTACHMENT_MAX_BYTES) {
        throw errors.validation('Datei ist zu gross.');
      }

      // The key must belong to a registered attachment.
      const att = await prisma.attachment.findUnique({ where: { storageKey: key } });
      if (!att) throw errors.notFound('Unbekannter Upload-Key');
      if (att.contentType !== contentType) {
        throw errors.validation('Medientyp weicht von der Registrierung ab.');
      }

      await getStorageDriver().put(key, body, contentType);

      await prisma.$transaction([
        prisma.attachment.update({
          where: { id: att.id },
          data: { uploadedAt: new Date(), sizeBytes: body.length },
        }),
        prisma.auditEvent.create({
          data: {
            tenantId: att.tenantId,
            approvalCaseId: att.approvalCaseId,
            type: 'CASE_ATTACHMENT_ADDED',
            actorType: 'USER',
            metadata: { fileName: att.fileName, sizeBytes: body.length, itemId: att.approvalItemId },
          },
        }),
      ]);

      return reply.status(200).send({ ok: true });
    },
  );

  // --- Serve the bytes back ------------------------------------------------
  app.get(
    '/uploads/local/*',
    {
      schema: {
        tags: ['approval-cases'],
        summary: 'Local storage: serve attachment bytes (dev download URL)',
      },
    },
    async (req, reply) => {
      const key = (req.params as Record<string, string>)['*'];
      if (!key) throw errors.notFound('Datei nicht gefunden');
      const att = await prisma.attachment.findUnique({ where: { storageKey: key } });
      if (!att || !att.uploadedAt) throw errors.notFound('Datei nicht gefunden');

      let data: Buffer;
      try {
        data = await getStorageDriver().read(key);
      } catch {
        throw errors.notFound('Datei nicht gefunden');
      }
      return reply
        .header('cache-control', 'private, max-age=300')
        .type(att.contentType)
        .send(data);
    },
  );
}
