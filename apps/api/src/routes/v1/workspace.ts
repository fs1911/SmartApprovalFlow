/**
 * Workspace settings + white-label branding (tenant-scoped).
 *
 *   GET   /api/v1/workspace     read current workspace settings/branding
 *   PATCH /api/v1/workspace     update name/branding/contact/locale
 *
 * These fields drive the public customer page (brand name, accent colour,
 * contact hint) — the foundation for partner / white-label use.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein Hex-Wert sein, z. B. #1f5fa8');

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  brandName: z.string().max(160).nullable().optional(),
  brandColor: hexColor.nullable().optional(),
  contactEmail: z.string().email().max(254).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(64).optional(),
  currency: z.string().length(3).optional(),
});

const SELECT = {
  id: true,
  slug: true,
  name: true,
  brandName: true,
  brandColor: true,
  contactEmail: true,
  contactPhone: true,
  locale: true,
  timezone: true,
  currency: true,
} as const;

export async function workspaceRoutes(app: FastifyInstance) {
  app.get(
    '/workspace',
    {
      preHandler: app.requirePermission('workspace:read'),
      schema: {
        tags: ['workspace'],
        summary: 'Read the current workspace settings and branding',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const tenant = await prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: SELECT,
      });
      return ok(tenant);
    },
  );

  app.patch(
    '/workspace',
    {
      preHandler: app.requirePermission('workspace:manage'),
      schema: {
        tags: ['workspace'],
        summary: 'Update workspace settings and branding',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const patch = updateWorkspaceSchema.parse(req.body);
      const tenant = await prisma.tenant.update({
        where: { id: auth.tenantId },
        data: patch,
        select: SELECT,
      });
      return ok(tenant);
    },
  );
}
