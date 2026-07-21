/**
 * Operational reporting for a workspace (tenant-scoped, read-only).
 *
 *   GET /api/v1/reporting/summary
 *
 * Deliberately a handful of *useful* numbers for a garage — not an analytics
 * suite: how many requests are open, the approval rate, how fast customers
 * respond, and activity in the last 7 days.
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';

export async function reportingRoutes(app: FastifyInstance) {
  app.get(
    '/reporting/summary',
    {
      preHandler: app.requirePermission('reporting:read'),
      schema: {
        tags: ['reporting'],
        summary: 'Key operational metrics for the current workspace',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const tenantId = req.auth!.tenantId;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [byStatus, total, sentLastWeek, answeredToday, respondedCases] = await Promise.all([
        prisma.approvalCase.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
        prisma.approvalCase.count({ where: { tenantId } }),
        prisma.approvalCase.count({ where: { tenantId, sentAt: { gte: weekAgo } } }),
        prisma.approvalCase.count({ where: { tenantId, respondedAt: { gte: todayStart } } }),
        prisma.approvalCase.findMany({
          where: { tenantId, respondedAt: { not: null }, sentAt: { not: null } },
          select: { sentAt: true, respondedAt: true },
        }),
      ]);

      const statusCount = (s: string) => byStatus.find((r) => r.status === s)?._count ?? 0;
      const approved = statusCount('APPROVED');
      const declined = statusCount('DECLINED');
      const decided = approved + declined;
      const pending = statusCount('SENT') + statusCount('VIEWED') + statusCount('CALLBACK');

      // Average customer response time (sent -> responded), in hours.
      const responseHours = respondedCases
        .map((c) => (c.respondedAt!.getTime() - c.sentAt!.getTime()) / 3_600_000)
        .filter((h) => h >= 0);
      const avgResponseHours =
        responseHours.length > 0
          ? Math.round((responseHours.reduce((a, b) => a + b, 0) / responseHours.length) * 10) / 10
          : null;

      return ok({
        totals: {
          all: total,
          draft: statusCount('DRAFT'),
          pending,
          approved,
          declined,
          callback: statusCount('CALLBACK'),
          expired: statusCount('EXPIRED'),
          cancelled: statusCount('CANCELLED'),
        },
        approvalRate: decided > 0 ? Math.round((approved / decided) * 100) : null,
        avgResponseHours,
        last7Days: { sent: sentLastWeek },
        answeredToday,
      });
    },
  );
}
