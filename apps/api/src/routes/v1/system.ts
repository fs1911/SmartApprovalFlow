/**
 * System endpoints: liveness + readiness. No auth.
 *
 *   GET /health        liveness — the process is up (never touches the DB).
 *   GET /health/ready  readiness — also checks the database is reachable, so an
 *                      orchestrator can hold traffic until dependencies are up.
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';

const SERVICE = 'smart-approval-flow-api';
// Overridable at deploy time (e.g. a git SHA or release tag); sensible default.
const VERSION = process.env.APP_VERSION ?? '1.0.0';

export async function systemRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Liveness probe (process up)',
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  service: { type: 'string' },
                  version: { type: 'string' },
                  time: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async () => ok({ status: 'ok', service: SERVICE, version: VERSION, time: new Date().toISOString() }),
  );

  app.get(
    '/health/ready',
    {
      schema: {
        tags: ['system'],
        summary: 'Readiness probe (process + database reachable)',
      },
    },
    async () => {
      const started = Date.now();
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        // 503 → orchestrators keep the instance out of rotation until the DB is up.
        throw errors.serviceUnavailable('Datenbank nicht erreichbar');
      }
      return ok({
        status: 'ready',
        service: SERVICE,
        version: VERSION,
        checks: { database: { ok: true, latencyMs: Date.now() - started } },
        time: new Date().toISOString(),
      });
    },
  );
}
