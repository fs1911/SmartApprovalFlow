/**
 * Data lifecycle — GDPR-style export & erasure (Block 15).
 *
 *   GET    /api/v1/customers/:id/export        full customer data (JSON)
 *   DELETE /api/v1/customers/:id?confirm=true  erase a customer + their cases
 *   GET    /api/v1/approval-cases/:id/export   single case (JSON)
 *   DELETE /api/v1/approval-cases/:id?confirm=true  erase a single case
 *
 * All require `data:manage` (OWNER/ADMIN). Erasure is irreversible and must carry
 * `?confirm=true`; it is recorded as a tenant-level DATA_ERASED audit event.
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { exportCustomer, exportCase, eraseCustomer, eraseCase } from '../../lib/data-lifecycle.js';

function confirmed(req: { query: unknown }): boolean {
  return (req.query as { confirm?: string }).confirm === 'true';
}

export async function dataRoutes(app: FastifyInstance) {
  // --- Customer export -----------------------------------------------------
  app.get(
    '/customers/:id/export',
    {
      preHandler: app.requirePermission('data:manage'),
      schema: {
        tags: ['workspace'],
        summary: 'Export all of a customer’s data (GDPR access)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const data = await exportCustomer(auth.tenantId, id);
      if (!data) throw errors.notFound('Kunde nicht gefunden');
      return reply
        .header('content-disposition', `attachment; filename="customer-${id}.json"`)
        .send(ok(data));
    },
  );

  // --- Customer erasure ----------------------------------------------------
  app.delete(
    '/customers/:id',
    {
      preHandler: app.requirePermission('data:manage'),
      schema: {
        tags: ['workspace'],
        summary: 'Erase a customer and all their cases (irreversible; ?confirm=true)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      if (!confirmed(req)) throw errors.validation('Löschung erfordert ?confirm=true.');

      const res = await eraseCustomer(auth.tenantId, id);
      if (!res.erased) throw errors.notFound('Kunde nicht gefunden');

      await prisma.auditEvent.create({
        data: {
          tenantId: auth.tenantId,
          type: 'DATA_ERASED',
          actorType: auth.userId ? 'USER' : 'SYSTEM',
          actorUserId: auth.userId ?? null,
          metadata: { kind: 'customer', customerId: id, casesErased: res.cases },
        },
      });
      return reply.status(200).send(ok({ erased: true, casesErased: res.cases }));
    },
  );

  // --- Case export ---------------------------------------------------------
  app.get(
    '/approval-cases/:id/export',
    {
      preHandler: app.requirePermission('data:manage'),
      schema: {
        tags: ['approval-cases'],
        summary: 'Export a single case as JSON (GDPR access)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const data = await exportCase(auth.tenantId, id);
      if (!data) throw errors.notFound('Approval-Fall nicht gefunden');
      return reply
        .header('content-disposition', `attachment; filename="case-${id}.json"`)
        .send(ok(data));
    },
  );

  // --- Case erasure --------------------------------------------------------
  app.delete(
    '/approval-cases/:id',
    {
      preHandler: app.requirePermission('data:manage'),
      schema: {
        tags: ['approval-cases'],
        summary: 'Erase a single case (irreversible; ?confirm=true)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      if (!confirmed(req)) throw errors.validation('Löschung erfordert ?confirm=true.');

      const erased = await eraseCase(auth.tenantId, id);
      if (!erased) throw errors.notFound('Approval-Fall nicht gefunden');

      await prisma.auditEvent.create({
        data: {
          tenantId: auth.tenantId,
          type: 'DATA_ERASED',
          actorType: auth.userId ? 'USER' : 'SYSTEM',
          actorUserId: auth.userId ?? null,
          metadata: { kind: 'case', caseId: id },
        },
      });
      return reply.status(200).send(ok({ erased: true }));
    },
  );
}
