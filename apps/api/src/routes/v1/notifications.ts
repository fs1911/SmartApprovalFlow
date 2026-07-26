/**
 * In-app notifications (Block 14).
 *
 *   GET  /api/v1/notifications              list (cursor pagination, ?unread=true)
 *   GET  /api/v1/notifications/unread-count unread count
 *   POST /api/v1/notifications/:id/read     mark one read
 *   POST /api/v1/notifications/read-all     mark all read
 *
 * Notifications are per-user; they require a user session (API keys carry no
 * user and simply see an empty list / zero count).
 */
import type { FastifyInstance } from 'fastify';
import { NOTIFICATION_LABELS } from '@saf/types';
import type { NotificationType } from '@saf/types';
import { prisma } from '@saf/db';
import { ok, paginated } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { encodeCursor, decodeCursor } from '../../lib/pagination.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.get(
    '/notifications',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['identity'],
        summary: 'List my notifications (cursor pagination; ?unread=true)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            unread: { type: 'string' },
          },
        },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const q = req.query as { cursor?: string; limit?: number; unread?: string };
      const limit = Math.min(Math.max(q.limit ?? 20, 1), 100);
      if (!auth.userId) return paginated([], { nextCursor: null, limit });

      const cursor = decodeCursor(q.cursor);
      const rows = await prisma.notification.findMany({
        where: {
          userId: auth.userId,
          tenantId: auth.tenantId,
          ...(q.unread === 'true' ? { readAt: null } : {}),
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
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page.at(-1);
      const nextCursor =
        hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

      return paginated(
        page.map((n) => ({
          id: n.id,
          type: n.type,
          label: NOTIFICATION_LABELS[n.type as NotificationType] ?? n.type,
          approvalCaseId: n.approvalCaseId,
          data: n.data,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
        { nextCursor, limit },
      );
    },
  );

  app.get(
    '/notifications/unread-count',
    {
      preHandler: app.requireAuth,
      schema: { tags: ['identity'], summary: 'Count my unread notifications', security: [{ bearerAuth: [] }] },
    },
    async (req) => {
      const auth = req.auth!;
      if (!auth.userId) return ok({ unread: 0 });
      const unread = await prisma.notification.count({
        where: { userId: auth.userId, tenantId: auth.tenantId, readAt: null },
      });
      return ok({ unread });
    },
  );

  app.post(
    '/notifications/:id/read',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['identity'],
        summary: 'Mark a notification as read',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      if (!auth.userId) throw errors.forbidden('Benachrichtigungen erfordern eine Nutzer-Sitzung.');
      const n = await prisma.notification.findFirst({ where: { id, userId: auth.userId } });
      if (!n) throw errors.notFound('Benachrichtigung nicht gefunden');
      if (!n.readAt) await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
      return ok({ id, read: true });
    },
  );

  app.post(
    '/notifications/read-all',
    {
      preHandler: app.requireAuth,
      schema: { tags: ['identity'], summary: 'Mark all my notifications read', security: [{ bearerAuth: [] }] },
    },
    async (req) => {
      const auth = req.auth!;
      if (!auth.userId) return ok({ updated: 0 });
      const res = await prisma.notification.updateMany({
        where: { userId: auth.userId, tenantId: auth.tenantId, readAt: null },
        data: { readAt: new Date() },
      });
      return ok({ updated: res.count });
    },
  );
}
