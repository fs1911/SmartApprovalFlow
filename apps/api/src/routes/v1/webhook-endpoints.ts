/**
 * Self-service outbound webhook management (Block 12).
 *
 *   POST   /api/v1/webhook-endpoints              create (secret returned once)
 *   GET    /api/v1/webhook-endpoints              list (no secrets)
 *   PATCH  /api/v1/webhook-endpoints/:id          update url / events / active
 *   POST   /api/v1/webhook-endpoints/:id/rotate-secret   new secret (once)
 *   POST   /api/v1/webhook-endpoints/:id/test     enqueue + deliver a test event
 *   DELETE /api/v1/webhook-endpoints/:id          delete
 *   GET    /api/v1/webhook-endpoints/:id/deliveries   recent deliveries (paged)
 *
 * All routes require members:manage (workspace admin config). Signing/retry reuse
 * the Block 7 delivery worker; nothing new is invented. The secret is stored so
 * deliveries can be HMAC-signed and is returned to the UI only at create/rotate.
 */
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DOMAIN_EVENT_TYPE } from '@saf/types';
import { prisma, Prisma } from '@saf/db';
import { ok, paginated } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { encodeCursor, decodeCursor } from '../../lib/pagination.js';
import { deliverNow } from '../../lib/webhooks.js';

/** Opaque signing secret. Kept retrievable (needed to HMAC-sign deliveries). */
function newWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

const eventsSchema = z
  .array(z.enum(DOMAIN_EVENT_TYPE))
  .max(DOMAIN_EVENT_TYPE.length)
  .optional();

const createSchema = z.object({
  url: z.string().url().max(2000),
  /** Event allowlist; empty/omitted = all events. */
  events: eventsSchema,
});

const updateSchema = z.object({
  url: z.string().url().max(2000).optional(),
  events: eventsSchema,
  isActive: z.boolean().optional(),
});

function toEventsString(events: string[] | undefined): string | undefined {
  if (events === undefined) return undefined;
  return events.join(' ');
}

export async function webhookEndpointRoutes(app: FastifyInstance) {
  // --- Create --------------------------------------------------------------
  app.post(
    '/webhook-endpoints',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['webhooks'],
        summary: 'Register an outbound webhook endpoint (secret returned once)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const input = createSchema.parse(req.body);
      const secret = newWebhookSecret();
      const ep = await prisma.webhookEndpoint.create({
        data: {
          tenantId: auth.tenantId,
          url: input.url,
          secret,
          events: toEventsString(input.events) ?? '',
          isActive: true,
        },
      });
      return reply.status(201).send(
        ok({
          id: ep.id,
          url: ep.url,
          events: ep.events,
          isActive: ep.isActive,
          // Shown once — store it in your receiver to verify signatures.
          secret,
        }),
      );
    },
  );

  // --- List ----------------------------------------------------------------
  app.get(
    '/webhook-endpoints',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['webhooks'],
        summary: 'List webhook endpoints (no secrets)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const rows = await prisma.webhookEndpoint.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, url: true, events: true, isActive: true, createdAt: true },
      });
      return ok({ endpoints: rows, availableEvents: DOMAIN_EVENT_TYPE });
    },
  );

  // --- Update --------------------------------------------------------------
  app.patch(
    '/webhook-endpoints/:id',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['webhooks'],
        summary: 'Update a webhook endpoint (url / events / active)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const input = updateSchema.parse(req.body);
      const ep = await prisma.webhookEndpoint.findFirst({ where: { id, tenantId: auth.tenantId } });
      if (!ep) throw errors.notFound('Webhook-Endpoint nicht gefunden');

      const updated = await prisma.webhookEndpoint.update({
        where: { id },
        data: {
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.events !== undefined ? { events: toEventsString(input.events) } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        select: { id: true, url: true, events: true, isActive: true },
      });
      return ok(updated);
    },
  );

  // --- Rotate secret -------------------------------------------------------
  app.post(
    '/webhook-endpoints/:id/rotate-secret',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['webhooks'],
        summary: 'Rotate the signing secret (returned once)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const ep = await prisma.webhookEndpoint.findFirst({ where: { id, tenantId: auth.tenantId } });
      if (!ep) throw errors.notFound('Webhook-Endpoint nicht gefunden');
      const secret = newWebhookSecret();
      await prisma.webhookEndpoint.update({ where: { id }, data: { secret } });
      return ok({ id, secret });
    },
  );

  // --- Test delivery -------------------------------------------------------
  app.post(
    '/webhook-endpoints/:id/test',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['webhooks'],
        summary: 'Send a signed test event to the endpoint and process delivery',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const ep = await prisma.webhookEndpoint.findFirst({ where: { id, tenantId: auth.tenantId } });
      if (!ep) throw errors.notFound('Webhook-Endpoint nicht gefunden');

      // Enqueue a test delivery directly (bypasses the event allowlist) and run
      // the shared, signed delivery worker so it's verifiable end to end.
      const delivery = await prisma.webhookDelivery.create({
        data: {
          tenantId: auth.tenantId,
          endpointId: ep.id,
          eventType: 'webhook.test',
          payload: {
            type: 'webhook.test',
            data: { message: 'Testzustellung von Nicka' },
            occurredAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          status: 'QUEUED',
        },
      });
      // Deliver this exact delivery now (ignores any backlog ordering).
      const result = await deliverNow(delivery.id);
      const row = await prisma.webhookDelivery.findUnique({
        where: { id: delivery.id },
        select: { status: true, attempts: true, lastError: true },
      });
      return ok({ deliveryId: delivery.id, result, delivery: row });
    },
  );

  // --- Delete --------------------------------------------------------------
  app.delete(
    '/webhook-endpoints/:id',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['webhooks'],
        summary: 'Delete a webhook endpoint',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const ep = await prisma.webhookEndpoint.findFirst({ where: { id, tenantId: auth.tenantId } });
      if (!ep) throw errors.notFound('Webhook-Endpoint nicht gefunden');
      await prisma.webhookEndpoint.delete({ where: { id } });
      return reply.status(200).send(ok({ deleted: true }));
    },
  );

  // --- Deliveries (paged) --------------------------------------------------
  app.get(
    '/webhook-endpoints/:id/deliveries',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['webhooks'],
        summary: 'Recent deliveries for an endpoint (cursor pagination)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        querystring: {
          type: 'object',
          properties: { cursor: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const q = req.query as { cursor?: string; limit?: number };
      const limit = Math.min(Math.max(q.limit ?? 20, 1), 100);

      const ep = await prisma.webhookEndpoint.findFirst({
        where: { id, tenantId: auth.tenantId },
        select: { id: true },
      });
      if (!ep) throw errors.notFound('Webhook-Endpoint nicht gefunden');

      const cursor = decodeCursor(q.cursor);
      const rows = await prisma.webhookDelivery.findMany({
        where: {
          endpointId: id,
          tenantId: auth.tenantId,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: new Date(cursor.createdAt) } },
                  { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: { id: true, eventType: true, status: true, attempts: true, lastError: true, createdAt: true },
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page.at(-1);
      const nextCursor =
        hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;
      return paginated(page, { nextCursor, limit });
    },
  );
}
