/**
 * System endpoints: liveness/readiness. No auth.
 */
import type { FastifyInstance } from 'fastify';
import { ok } from '../../lib/envelope.js';

export async function systemRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Liveness/readiness probe',
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
    async () =>
      ok({
        status: 'ok',
        service: 'smart-approval-flow-api',
        version: '1.0.0-block1',
        time: new Date().toISOString(),
      }),
  );
}
