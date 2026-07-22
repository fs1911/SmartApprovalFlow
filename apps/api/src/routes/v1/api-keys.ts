/**
 * API key management (integration readiness).
 *
 *   GET    /api/v1/api-keys        list (never returns the secret)
 *   POST   /api/v1/api-keys        create — returns the raw key ONCE
 *   DELETE /api/v1/api-keys/:id    revoke
 *
 * Requires members:manage (OWNER/ADMIN). A key's scopes are a subset of the
 * shared Permission set and are enforced by the same requirePermission path.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@saf/db';
import { PERMISSIONS } from '@saf/types';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { generateApiKey, parseScopes, scopesToString } from '../../lib/api-keys.js';

const createSchema = z.object({
  name: z.string().min(1).max(120),
  /** Space-delimited scopes; invalid ones are dropped. */
  scopes: z.string().default(''),
});

export async function apiKeyRoutes(app: FastifyInstance) {
  app.get(
    '/api-keys',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: { tags: ['api-keys'], summary: 'List API keys (no secrets)', security: [{ bearerAuth: [] }] },
    },
    async (req) => {
      const keys = await prisma.apiKey.findMany({
        where: { tenantId: req.auth!.tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          lastUsedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      });
      return ok({ keys, availableScopes: PERMISSIONS });
    },
  );

  app.post(
    '/api-keys',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['api-keys'],
        summary: 'Create an API key — the secret is returned exactly once',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const input = createSchema.parse(req.body);
      const scopes = parseScopes(input.scopes);
      const generated = generateApiKey('live');

      const created = await prisma.apiKey.create({
        data: {
          tenantId: auth.tenantId,
          name: input.name,
          keyHash: generated.keyHash,
          keyPrefix: generated.prefix,
          scopes: scopesToString(scopes),
        },
        select: { id: true, name: true, keyPrefix: true, scopes: true, createdAt: true },
      });

      // The raw key is shown once and never stored in plaintext.
      return reply.status(201).send(ok({ ...created, key: generated.raw, scopes: scopes }));
    },
  );

  app.delete(
    '/api-keys/:id',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['api-keys'],
        summary: 'Revoke an API key',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const existing = await prisma.apiKey.findFirst({
        where: { id, tenantId: auth.tenantId },
        select: { id: true, revokedAt: true },
      });
      if (!existing) throw errors.notFound('API-Key nicht gefunden');
      await prisma.apiKey.update({ where: { id }, data: { revokedAt: existing.revokedAt ?? new Date() } });
      return ok({ id, revoked: true });
    },
  );
}
