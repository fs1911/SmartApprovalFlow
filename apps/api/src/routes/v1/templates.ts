/**
 * Message template endpoints (MVP config surface).
 *
 *   GET   /api/v1/templates        list the tenant's templates
 *   GET   /api/v1/templates/:id    read one
 *   PATCH /api/v1/templates/:id    edit subject/body
 *
 * Deliberately small: subject + body with {{placeholders}}, no versioning or
 * template engine. See docs/api-design.md → "Message templates".
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { TEMPLATE_VARIABLES } from '../../lib/templates.js';

const updateTemplateSchema = z
  .object({
    subject: z.string().max(200).optional(),
    body: z.string().min(1).max(4000).optional(),
  })
  .refine((v) => v.subject !== undefined || v.body !== undefined, {
    message: 'Mindestens subject oder body muss angegeben werden',
  });

export async function templateRoutes(app: FastifyInstance) {
  app.get(
    '/templates',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['templates'],
        summary: 'List message templates for the current tenant',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const templates = await prisma.messageTemplate.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { key: 'asc' },
      });
      return ok({ templates, variables: TEMPLATE_VARIABLES });
    },
  );

  app.get(
    '/templates/:id',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['templates'],
        summary: 'Read one message template',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const tpl = await prisma.messageTemplate.findFirst({
        where: { id, tenantId: auth.tenantId },
      });
      if (!tpl) throw errors.notFound('Vorlage nicht gefunden');
      return ok(tpl);
    },
  );

  app.patch(
    '/templates/:id',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['templates'],
        summary: 'Update a template’s subject and/or body',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const patch = updateTemplateSchema.parse(req.body);

      // Tenant-scoped existence check before update (isolation guard).
      const existing = await prisma.messageTemplate.findFirst({
        where: { id, tenantId: auth.tenantId },
        select: { id: true },
      });
      if (!existing) throw errors.notFound('Vorlage nicht gefunden');

      const updated = await prisma.messageTemplate.update({
        where: { id },
        data: { subject: patch.subject, body: patch.body },
      });
      return ok(updated);
    },
  );
}
