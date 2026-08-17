/**
 * Saved filter views (Block 28) with private views + personal default (Block 29).
 *
 *   GET    /api/v1/saved-views          list views visible to the caller (+ default)
 *   POST   /api/v1/saved-views          create a named view (SHARED or PRIVATE)
 *   POST   /api/v1/saved-views/:id/duplicate  copy a view's filters + visibility
 *   PATCH  /api/v1/saved-views/:id       rename a view (own private, or any shared)
 *   DELETE /api/v1/saved-views/:id       delete a view (own private, or any shared)
 *   POST   /api/v1/saved-views/default   set the caller's personal default view
 *   DELETE /api/v1/saved-views/default   clear the caller's personal default view
 *   POST   /api/v1/saved-views/reorder   set the manual display order (Block 32)
 *
 * A saved view is a named bundle of the approval-list filters
 * (status/category/urgency/createdWithin/assignee). Reading needs `cases:read`;
 * creating/deleting needs `cases:create`. SHARED views belong to the workspace;
 * PRIVATE views are visible only to their creator. The personal default is per
 * user and drives the approvals list when opened without explicit filters.
 * Everything is tenant-scoped; nothing about the existing list/filter flow
 * changes — views only pre-compose query params.
 */
import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@saf/db';
import {
  createSavedViewSchema,
  renameSavedViewSchema,
  reorderSavedViewsSchema,
  setDefaultViewSchema,
} from '@saf/types';
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
  createdFrom?: string;
  createdTo?: string;
  assignee?: string;
}) {
  return {
    status: filters.status ?? null,
    category: filters.category ?? null,
    urgency: filters.urgency ?? null,
    createdWithin: filters.createdWithin ?? null,
    createdFrom: filters.createdFrom ?? null,
    createdTo: filters.createdTo ?? null,
    assignee: filters.assignee ?? null,
  };
}

/** Rebuild the public filters object from stored columns (drops nulls). */
function toFilters(row: {
  status: string | null;
  category: string | null;
  urgency: string | null;
  createdWithin: string | null;
  createdFrom: string | null;
  createdTo: string | null;
  assignee: string | null;
}) {
  const filters: Record<string, string> = {};
  if (row.status) filters.status = row.status;
  if (row.category) filters.category = row.category;
  if (row.urgency) filters.urgency = row.urgency;
  if (row.createdWithin) filters.createdWithin = row.createdWithin;
  if (row.createdFrom) filters.createdFrom = row.createdFrom;
  if (row.createdTo) filters.createdTo = row.createdTo;
  if (row.assignee) filters.assignee = row.assignee;
  return filters;
}

/**
 * Which views the caller may see: all SHARED views of the tenant, plus their own
 * PRIVATE views. Without a user context (dev header / API key) only SHARED views
 * are visible — private views are always attributed to a concrete user.
 */
function visibilityWhere(tenantId: string, userId?: string): Prisma.SavedViewWhereInput {
  const or: Prisma.SavedViewWhereInput[] = [{ visibility: 'SHARED' }];
  if (userId) or.push({ visibility: 'PRIVATE', createdById: userId });
  return { tenantId, OR: or };
}

export async function savedViewRoutes(app: FastifyInstance) {
  // --- List ----------------------------------------------------------------
  app.get(
    '/saved-views',
    {
      preHandler: app.requirePermission('cases:read'),
      schema: {
        tags: ['saved-views'],
        summary: 'List saved filter views visible to the caller (with default)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const [rows, def] = await Promise.all([
        prisma.savedView.findMany({
          where: visibilityWhere(auth.tenantId, auth.userId),
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
        auth.userId
          ? prisma.savedViewDefault.findUnique({ where: { userId: auth.userId } })
          : Promise.resolve(null),
      ]);
      return ok({
        views: rows.map((row) => ({
          id: row.id,
          name: row.name,
          visibility: row.visibility,
          filters: toFilters(row),
          createdAt: row.createdAt,
        })),
        defaultViewId: def?.savedViewId ?? null,
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
        summary: 'Create a named saved filter view (SHARED or PRIVATE)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const input = createSavedViewSchema.parse(req.body);
      if (input.visibility === 'PRIVATE' && !auth.userId) {
        throw errors.validation('Private Ansichten benötigen eine angemeldete Nutzer-Sitzung.');
      }
      try {
        const row = await prisma.savedView.create({
          data: {
            tenantId: auth.tenantId,
            createdById: auth.userId ?? null,
            name: input.name,
            visibility: input.visibility,
            ...toRow(input.filters),
          },
        });
        return reply.status(201).send(
          ok({
            id: row.id,
            name: row.name,
            visibility: row.visibility,
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

  // --- Duplicate -----------------------------------------------------------
  // Copies a visible view's filters + visibility into a new view named
  // "<name> (Kopie)" (auto-incrementing on collision), placed at the end.
  app.post(
    '/saved-views/:id/duplicate',
    {
      preHandler: app.requirePermission('cases:create'),
      schema: {
        tags: ['saved-views'],
        summary: 'Duplicate a saved filter view (copies its filters + visibility)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      // Only a visible view can be duplicated — a foreign private view is
      // invisible here and therefore reports 404 (no existence leak).
      const source = await prisma.savedView.findFirst({
        where: { id, ...visibilityWhere(auth.tenantId, auth.userId) },
      });
      if (!source) throw errors.notFound('Ansicht nicht gefunden');

      // The copy lands at the end of the caller's visible list.
      const agg = await prisma.savedView.aggregate({
        where: visibilityWhere(auth.tenantId, auth.userId),
        _max: { sortOrder: true },
      });
      const nextOrder = (agg._max.sortOrder ?? -1) + 1;

      // "<name> (Kopie)", then "(Kopie 2)", "(Kopie 3)" … until unique per tenant.
      // The base is truncated so the suffixed name never exceeds 80 chars.
      for (let i = 1; i <= 100; i++) {
        const suffix = i === 1 ? ' (Kopie)' : ` (Kopie ${i})`;
        const name = `${source.name.slice(0, 80 - suffix.length)}${suffix}`;
        try {
          const row = await prisma.savedView.create({
            data: {
              tenantId: auth.tenantId,
              createdById: auth.userId ?? null,
              name,
              visibility: source.visibility,
              status: source.status,
              category: source.category,
              urgency: source.urgency,
              createdWithin: source.createdWithin,
              createdFrom: source.createdFrom,
              createdTo: source.createdTo,
              assignee: source.assignee,
              sortOrder: nextOrder,
            },
          });
          return reply.status(201).send(
            ok({
              id: row.id,
              name: row.name,
              visibility: row.visibility,
              filters: toFilters(row),
              createdAt: row.createdAt,
            }),
          );
        } catch (err) {
          if (isUniqueViolation(err)) continue; // name taken → try next suffix
          throw err;
        }
      }
      throw errors.conflict('Es gibt bereits zu viele Kopien dieser Ansicht.');
    },
  );

  // --- Set personal default ------------------------------------------------
  // Registered before the ":id" routes so the literal path always wins.
  app.post(
    '/saved-views/default',
    {
      preHandler: app.requirePermission('cases:read'),
      schema: {
        tags: ['saved-views'],
        summary: "Set the caller's personal default view",
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      if (!auth.userId) {
        throw errors.validation('Eine Standard-Ansicht benötigt eine angemeldete Nutzer-Sitzung.');
      }
      const { savedViewId } = setDefaultViewSchema.parse(req.body);
      // The view must exist and be visible to the caller.
      const view = await prisma.savedView.findFirst({
        where: { id: savedViewId, ...visibilityWhere(auth.tenantId, auth.userId) },
        select: { id: true },
      });
      if (!view) throw errors.notFound('Ansicht nicht gefunden');
      await prisma.savedViewDefault.upsert({
        where: { userId: auth.userId },
        create: { tenantId: auth.tenantId, userId: auth.userId, savedViewId },
        update: { savedViewId },
      });
      return ok({ defaultViewId: savedViewId });
    },
  );

  // --- Clear personal default ----------------------------------------------
  app.delete(
    '/saved-views/default',
    {
      preHandler: app.requirePermission('cases:read'),
      schema: {
        tags: ['saved-views'],
        summary: "Clear the caller's personal default view",
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      if (!auth.userId) return ok({ defaultViewId: null });
      // Idempotent: deleteMany never throws when there is no row.
      await prisma.savedViewDefault.deleteMany({ where: { userId: auth.userId } });
      return ok({ defaultViewId: null });
    },
  );

  // --- Reorder -------------------------------------------------------------
  // Registered before the ":id" routes so the literal path always wins. The
  // client sends the desired order of the ids it currently sees; we write each
  // visible view's sortOrder from its position. Ids the caller may not see are
  // ignored (never touched), so one user cannot reorder another's private views.
  app.post(
    '/saved-views/reorder',
    {
      preHandler: app.requirePermission('cases:create'),
      schema: {
        tags: ['saved-views'],
        summary: 'Set the manual display order of saved views',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { orderedIds } = reorderSavedViewsSchema.parse(req.body);
      const visible = await prisma.savedView.findMany({
        where: visibilityWhere(auth.tenantId, auth.userId),
        select: { id: true },
      });
      const visibleIds = new Set(visible.map((v) => v.id));
      const effective = orderedIds.filter((id) => visibleIds.has(id));
      await prisma.$transaction(
        effective.map((id, index) =>
          prisma.savedView.updateMany({
            where: { id, ...visibilityWhere(auth.tenantId, auth.userId) },
            data: { sortOrder: index },
          }),
        ),
      );
      return ok({ orderedIds: effective });
    },
  );

  // --- Rename --------------------------------------------------------------
  app.patch(
    '/saved-views/:id',
    {
      preHandler: app.requirePermission('cases:create'),
      schema: {
        tags: ['saved-views'],
        summary: 'Rename a saved filter view (own private, or any shared)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const { name } = renameSavedViewSchema.parse(req.body);
      // Only a visible view can be renamed — another user's private view is
      // invisible here and therefore reports 404, not 403 (no existence leak).
      const existing = await prisma.savedView.findFirst({
        where: { id, ...visibilityWhere(auth.tenantId, auth.userId) },
        select: { id: true },
      });
      if (!existing) throw errors.notFound('Ansicht nicht gefunden');
      try {
        const row = await prisma.savedView.update({ where: { id }, data: { name } });
        return ok({
          id: row.id,
          name: row.name,
          visibility: row.visibility,
          filters: toFilters(row),
          createdAt: row.createdAt,
        });
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
        summary: 'Delete a saved filter view (own private, or any shared)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      // Only a visible view can be deleted — another user's private view is
      // invisible here and therefore reports 404, not 403 (no existence leak).
      const existing = await prisma.savedView.findFirst({
        where: { id, ...visibilityWhere(auth.tenantId, auth.userId) },
        select: { id: true },
      });
      if (!existing) throw errors.notFound('Ansicht nicht gefunden');
      await prisma.savedView.delete({ where: { id } });
      return reply.status(200).send(ok({ deleted: true }));
    },
  );
}
