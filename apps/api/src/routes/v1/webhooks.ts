/**
 * Webhook operations.
 *
 *   POST /api/v1/webhooks/deliver     process pending deliveries (members:manage)
 *   POST /api/v1/dev/webhook-sink     local receiver for testing (dev only)
 *
 * The dev sink verifies the HMAC signature and logs — it lets the whole delivery
 * path be exercised locally with no external service.
 */
import type { FastifyInstance } from 'fastify';
import { ok } from '../../lib/envelope.js';
import { deliverPending, verifySignature } from '../../lib/webhooks.js';
import { config } from '../../config.js';

export async function webhookRoutes(app: FastifyInstance) {
  app.post(
    '/webhooks/deliver',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['webhooks'],
        summary: 'Process pending webhook deliveries (signed, with retry/backoff)',
        security: [{ bearerAuth: [] }],
      },
    },
    async () => ok(await deliverPending()),
  );

  // Local test receiver — not registered in production.
  if (config.NODE_ENV !== 'production') {
    app.post(
      '/dev/webhook-sink',
      { schema: { tags: ['webhooks'], summary: 'Dev-only webhook receiver (verifies signature)' } },
      async (req, reply) => {
        const signature = (req.headers['x-saf-signature'] as string) ?? '';
        // Re-serialise the parsed body; matches the sender's JSON.stringify since
        // both derive from the same stored payload (key order preserved on parse).
        const raw = JSON.stringify(req.body);
        // Secret must match the endpoint used in tests/seed.
        const secret = (req.headers['x-saf-sink-secret'] as string) ?? 'whsec_dev_sink';
        const valid = verifySignature(secret, raw, signature);
        req.log.info(
          { event: req.headers['x-saf-event'], delivery: req.headers['x-saf-delivery'], valid },
          '📨 dev webhook-sink received',
        );
        if (!valid) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'bad signature' } });
        return reply.status(200).send({ received: true });
      },
    );
  }
}
