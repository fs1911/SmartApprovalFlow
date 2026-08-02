/**
 * Saved filter views (Block 28).
 *
 *   GET    /api/v1/saved-views       list this workspace's saved views
 *   POST   /api/v1/saved-views       create a named view from a filter combination
 *   DELETE /api/v1/saved-views/:id   delete a saved view
 *
 * A saved view is just a named bundle of the approval-list filters
 * (status/category/urgency/createdWithin/assignee). Reading needs `cases:read`;
 * creating/deleting needs `cases:create` (advisors curate the shared list).
 * Everything is tenant-scoped; names are unique per tenant. Nothing about the
 * existing list/filter flow changes — views only pre-compose query params.
 */
import type { FastifyInstance } from 'fastify';
import { createSavedViewSchema } from '@saf/types';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/reference.js';

/** Flatten the nested filters object into the stored columns. */
function toRow(filters: {
  status?: string;
  category?: string;
  urgency?: string;
  createdWithin?: string;
  assignee?: string;
}) {
  return {
    status: filters.status ?? null,
    category: filters.category ?? null,
    urgency: filters.urgency ?? null,
    createdWithin: filters.createdWithin ?? null,
    assignee: filters.assignee ?? null,
  };
}

/** Rebuild the public filters object from stored columns (drops nulls). */
function toFilters(row: {
  status: string | null;
  category: string | null;
  urgency: string | null;
  createdWithin: string | null;
  assignee: string | null;
}) {
  const filters: Record<string, string> = {};
  if (row.status) filters.status = row.status;
  if (row.category) filters.category = row.category;
  if (row.urgency) filters.urgency = row.urgency;
  if (row.createdWithin) filters.createdWithin = row.createdWithin;
  if (row.assignee) filters.assignee = row.assignee;
  return filters;
}

export async function savedViewRoutes(app: FastifyInstance) {
  // --- List ----------------------------------------------------------------
  app.get(
    '/saved-views',
    {
      preHandler: app.requirePermission('cases:read'),
      schema: {
        tags: ['saved-views'],
        summary: 'List saved filter views for this workspace',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const rows = await prisma.savedView.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: [{ createdAt: 'asc' }],
      });
      return ok({
        views: rows.map((row) => ({
          id: row.id,
          name: row.name,
          filters: toFilters(row),
          createdAt: row.createdAt,
        })),
      });
    },
  );

  // --- Create --------------------------------------------------------------
  app.post(
    '/saved-views',
    {
      preHandler: app.requirePermission('cases:create'),
      schema: {
        tags: ['saved-views'],
        summary: 'Create a named saved filter view',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const input = createSavedViewSchema.parse(req.body);
      try {
        const row = await prisma.savedView.create({
          data: {
            tenantId: auth.tenantId,
            createdById: auth.userId ?? null,
            name: input.name,
            ...toRow(input.filters),
          },
        });
        return reply.status(201).send(
          ok({
            id: row.id,
            name: row.name,
            filters: toFilters(row),
            createdAt: row.createdAt,
          }),
        );
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw errors.conflict('Es gibt bereits eine Ansicht mit diesem Namen.');
        }
        throw err;
      }
    },
  );

  // --- Delete --------------------------------------------------------------
  app.delete(
    '/saved-views/:id',
    {
      preHandler: app.requirePermission('cases:create'),
      schema: {
        tags: ['saved-views'],
        summary: 'Delete a saved filter view',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const existing = await prisma.savedView.findFirst({
        where: { id, tenantId: auth.tenantId },
      });
      if (!existing) throw errors.notFound('Ansicht nicht gefunden');
      await prisma.savedView.delete({ where: { id } });
      return reply.status(200).send(ok({ deleted: true }));
    },
  );
}
