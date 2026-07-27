/**
 * Admin overview + workspace membership (Block 15).
 *
 *   GET /api/v1/admin/overview   workspace-level counts, storage, plan, retention
 *   GET /api/v1/workspaces       workspaces the caller is a member of
 *
 * Overview requires members:manage (OWNER/ADMIN). The workspaces list is per
 * user — in the MVP a user belongs to one tenant (adr-003), but the endpoint is
 * membership-driven so multi-workspace stays non-breaking later.
 */
import type { FastifyInstance } from 'fastify';
import { ROLE_LABELS, PLANS } from '@saf/types';
import type { Role } from '@saf/types';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { getSubscription } from '../../lib/usage.js';
import { policyFromConfig } from '../../lib/retention.js';
import { config } from '../../config.js';

export async function adminRoutes(app: FastifyInstance) {
  app.get(
    '/admin/overview',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['workspace'],
        summary: 'Admin overview: members, cases, storage, plan, retention',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const tenantId = req.auth!.tenantId;
      const [members, pendingInvites, customers, casesByStatus, attachmentAgg, sub] = await Promise.all([
        prisma.membership.count({ where: { tenantId } }),
        prisma.verificationToken.count({
          where: { tenantId, type: 'INVITE', consumedAt: null, revokedAt: null },
        }),
        prisma.customer.count({ where: { tenantId } }),
        prisma.approvalCase.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
        prisma.attachment.aggregate({ where: { tenantId }, _count: true, _sum: { sizeBytes: true } }),
        getSubscription(tenantId),
      ]);

      const statusCounts: Record<string, number> = {};
      for (const r of casesByStatus) statusCounts[r.status] = r._count;
      const totalCases = casesByStatus.reduce((n, r) => n + r._count, 0);

      return ok({
        members,
        pendingInvites,
        customers,
        cases: { total: totalCases, byStatus: statusCounts },
        storage: {
          attachments: attachmentAgg._count,
          bytes: attachmentAgg._sum.sizeBytes ?? 0,
        },
        plan: { key: sub.planKey, label: PLANS[sub.planKey].label, status: sub.status },
        retention: {
          ...policyFromConfig(),
          note:
            config.RETENTION_CASE_MONTHS > 0
              ? `Terminale Fälle werden nach ${config.RETENTION_CASE_MONTHS} Monaten gelöscht.`
              : 'Automatische Fall-Löschung ist deaktiviert.',
        },
      });
    },
  );

  app.get(
    '/workspaces',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['identity'],
        summary: 'Workspaces the current user is a member of',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      if (!auth.userId) {
        // API-key context is bound to exactly one tenant.
        return ok({
          workspaces: [{ tenantId: auth.tenantId, slug: auth.tenantSlug, role: null, current: true }],
        });
      }
      const memberships = await prisma.membership.findMany({
        where: { userId: auth.userId },
        include: { tenant: { select: { id: true, slug: true, name: true, brandName: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return ok({
        workspaces: memberships.map((m) => ({
          tenantId: m.tenantId,
          slug: m.tenant.slug,
          name: m.tenant.brandName ?? m.tenant.name,
          role: m.role,
          roleLabel: ROLE_LABELS[m.role as Role],
          current: m.tenantId === auth.tenantId,
        })),
      });
    },
  );
}
