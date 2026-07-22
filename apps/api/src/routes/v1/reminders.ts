/**
 * Reminder-policy trigger (Block 8).
 *
 *   POST /api/v1/reminders/run   evaluate + send due reminders (members:manage)
 *
 * There is deliberately no cron dependency: an operator, a scheduled Routine, or
 * an external scheduler POSTs here on a cadence. The policy itself lives in
 * lib/reminders.ts (pure `decideReminder`) and is unit-tested. See
 * docs/reminders.md.
 */
import type { FastifyInstance } from 'fastify';
import { ok } from '../../lib/envelope.js';
import { runReminders, policyFromConfig } from '../../lib/reminders.js';

export async function reminderRoutes(app: FastifyInstance) {
  app.post(
    '/reminders/run',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['approval-cases'],
        summary: 'Run the automatic reminder policy for this tenant',
        description:
          'Evaluates every pending case against the configured reminder policy and sends the ones that are due. Safe to call repeatedly. Returns a summary of evaluated / sent / skipped.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const result = await runReminders(auth.tenantId);
      return ok({ policy: policyFromConfig(), ...result });
    },
  );
}
