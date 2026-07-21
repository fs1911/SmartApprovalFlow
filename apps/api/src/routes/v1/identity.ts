/**
 * Identity endpoints: current caller and tenant lookup. Require auth.
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@saf/db';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@saf/types';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';

export async function identityRoutes(app: FastifyInstance) {
  app.get(
    '/me',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['identity'],
        summary: 'Current authenticated principal and active tenant',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      let user = null;
      if (auth.userId) {
        user = await prisma.user
          .findUnique({ where: { id: auth.userId }, select: { id: true, name: true, email: true } })
          .catch(() => null);
      }
      return ok({
        user,
        tenant: { id: auth.tenantId, slug: auth.tenantSlug },
        role: auth.role,
        roleLabel: ROLE_LABELS[auth.role],
        permissions: ROLE_PERMISSIONS[auth.role],
        scopes: auth.scopes,
        via: auth.via,
      });
    },
  );

  app.get(
    '/tenants/:tenantId',
    {
      preHandler: app.requirePermission('workspace:read'),
      schema: {
        tags: ['identity'],
        summary: 'Fetch a tenant (must match the caller’s tenant)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { tenantId: { type: 'string' } },
          required: ['tenantId'],
        },
      },
    },
    async (req) => {
      const { tenantId } = req.params as { tenantId: string };
      const auth = req.auth!;

      // Tenant isolation: never let a caller read another tenant.
      if (tenantId !== auth.tenantId && tenantId !== auth.tenantSlug) {
        throw errors.forbidden('Zugriff auf fremden Workspace nicht erlaubt');
      }

      const tenant = await prisma.tenant
        .findFirst({
          where: { OR: [{ id: tenantId }, { slug: tenantId }] },
          select: {
            id: true,
            slug: true,
            name: true,
            brandName: true,
            locale: true,
            timezone: true,
            currency: true,
          },
        })
        .catch(() => null);

      if (!tenant) throw errors.notFound('Workspace nicht gefunden');
      return ok(tenant);
    },
  );
}
