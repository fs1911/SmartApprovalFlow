/**
 * Maintenance / cleanup trigger (Block 9).
 *
 *   POST /api/v1/maintenance/cleanup   remove stale rows (members:manage)
 *
 * No cron dependency: an operator or an external scheduler POSTs here on a
 * cadence. The policy lives in lib/retention.ts (pure `retentionCutoffs`) and is
 * unit-tested. See docs/retention-and-cleanup.md.
 */
import type { FastifyInstance } from 'fastify';
import { ok } from '../../lib/envelope.js';
import { runCleanup, policyFromConfig } from '../../lib/retention.js';

export async function maintenanceRoutes(app: FastifyInstance) {
  app.post(
    '/maintenance/cleanup',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['system'],
        summary: 'Run retention cleanup for this tenant',
        description:
          'Removes expired idempotency records, terminal webhook deliveries past the retention window, and orphaned (never-uploaded) attachments. Safe to call repeatedly; returns the counts removed.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const result = await runCleanup(auth.tenantId);
      req.log.info({ tenantId: auth.tenantId, ...result }, 'retention cleanup run');
      return ok({ policy: policyFromConfig(), ...result });
    },
  );
}
