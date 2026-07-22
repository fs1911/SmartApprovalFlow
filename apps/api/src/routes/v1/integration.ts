/**
 * Integration helpers (Block 12).
 *
 *   GET /api/v1/integration/whoami   who am I? (tenant + auth method + scopes)
 *
 * A tiny, auth-any endpoint so an integrator can verify their API key works and
 * see exactly which permissions/scopes it carries before building against it.
 */
import type { FastifyInstance } from 'fastify';
import { ok } from '../../lib/envelope.js';

export async function integrationRoutes(app: FastifyInstance) {
  app.get(
    '/integration/whoami',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['api-keys'],
        summary: 'Verify credentials: returns tenant, auth method and permissions',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      return ok({
        tenant: { id: auth.tenantId, slug: auth.tenantSlug },
        via: auth.via, // 'session' | 'api_key' | 'dev'
        role: auth.role ?? null,
        userId: auth.userId ?? null,
        permissions: auth.permissions,
      });
    },
  );
}
