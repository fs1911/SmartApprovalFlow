/**
 * Approval case endpoints — the core of the wedge product.
 *
 *   GET  /api/v1/approval-cases        list (cursor pagination, tenant-scoped)
 *   POST /api/v1/approval-cases        create (validated, idempotent)
 *   GET  /api/v1/approval-cases/:id    detail (tenant-scoped)
 *
 * Business rules are kept deliberately light in Block 1; the full lifecycle
 * (sending links, state machine, notifications) is Block 2. What matters here
 * is that the contract, validation, tenancy and audit wiring are correct.
 */
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { createApprovalCaseSchema, listQuerySchema } from '@saf/types';
import { prisma } from '@saf/db';
import { config } from '../../config.js';
import { ok, paginated } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { encodeCursor, decodeCursor } from '../../lib/pagination.js';
import { getIdempotent, saveIdempotent } from '../../lib/idempotency.js';
import { issueAccessToken, defaultLinkExpiry } from '../../lib/access-link.js';
import { dispatchMessage } from '../../lib/notifications.js';
import { renderTemplate } from '../../lib/templates.js';
import { buildCaseContext } from '../../lib/case-context.js';
import { publishEvent } from '../../lib/events.js';
import { isPending } from '../../lib/status.js';

function fingerprint(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/** Per-tenant human reference like AC-2026-0007. Simplified for Block 1. */
async function nextReference(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.approvalCase
    .count({ where: { tenantId } })
    .catch(() => Math.floor(Math.random() * 1000));
  return `AC-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function approvalCaseRoutes(app: FastifyInstance) {
  // --- List ----------------------------------------------------------------
  app.get(
    '/approval-cases',
    {
      preHandler: app.requirePermission('cases:read'),
      schema: {
        tags: ['approval-cases'],
        summary: 'List approval cases for the current tenant',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            status: { type: 'string' },
          },
        },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const q = listQuerySchema.parse(req.query);
      const cursor = decodeCursor(q.cursor);

      const rows = await prisma.approvalCase.findMany({
        where: {
          tenantId: auth.tenantId,
          ...(q.status ? { status: q.status as never } : {}),
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
        take: q.limit + 1,
        include: {
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, plate: true, make: true, model: true } },
          _count: { select: { items: true } },
        },
      });

      const hasMore = rows.length > q.limit;
      const page = hasMore ? rows.slice(0, q.limit) : rows;
      const last = page.at(-1);
      const nextCursor =
        hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

      return paginated(page, { nextCursor, limit: q.limit });
    },
  );

  // --- Create --------------------------------------------------------------
  app.post(
    '/approval-cases',
    {
      preHandler: app.requirePermission('cases:create'),
      schema: {
        tags: ['approval-cases'],
        summary: 'Create an approval case',
        description:
          'Validated against the shared Zod schema. Supports the `Idempotency-Key` header to make retries safe.',
        security: [{ bearerAuth: [] }],
        headers: {
          type: 'object',
          properties: { 'idempotency-key': { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const input = createApprovalCaseSchema.parse(req.body);

      // Idempotency: replay prior response, or reject key reuse with new body.
      const idemKey = req.headers['idempotency-key'] as string | undefined;
      const fp = fingerprint({ tenantId: auth.tenantId, input });
      if (idemKey) {
        const prior = await getIdempotent(auth.tenantId, idemKey);
        if (prior) {
          if (prior.fingerprint !== fp) throw errors.idempotencyReuse();
          return reply.status(prior.statusCode).send(prior.body);
        }
      }

      const reference = await nextReference(auth.tenantId);
      const actorType: 'USER' | 'SYSTEM' = auth.userId ? 'USER' : 'SYSTEM';

      // Create customer (and optional vehicle) first, then the case with scalar
      // foreign keys. This keeps us on Prisma's "unchecked" create variant so we
      // can pass tenantId directly while still nesting the child items/audit rows.
      const created = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            tenantId: auth.tenantId,
            name: input.customer.name,
            email: input.customer.email,
            phone: input.customer.phone,
          },
        });

        let vehicleId: string | null = null;
        if (input.vehicle) {
          const vehicle = await tx.vehicle.create({
            data: {
              tenantId: auth.tenantId,
              customerId: customer.id,
              plate: input.vehicle.plate,
              vin: input.vehicle.vin,
              make: input.vehicle.make,
              model: input.vehicle.model,
              year: input.vehicle.year,
            },
          });
          vehicleId = vehicle.id;
        }

        return tx.approvalCase.create({
          data: {
            tenantId: auth.tenantId,
            reference,
            subject: input.subject,
            description: input.description,
            urgency: input.urgency,
            status: input.sendImmediately ? 'SENT' : 'DRAFT',
            sentAt: input.sendImmediately ? new Date() : null,
            createdById: auth.userId ?? null,
            customerId: customer.id,
            vehicleId,
            items: {
              create: input.items.map((it, idx) => ({
                tenantId: auth.tenantId,
                title: it.title,
                description: it.description,
                category: it.category,
                priceMinMinor: it.priceBand?.minMinor ?? null,
                priceMaxMinor: it.priceBand?.maxMinor ?? null,
                currency: it.priceBand?.currency ?? 'CHF',
                sortOrder: idx,
              })),
            },
            auditEvents: {
              create: [
                {
                  tenantId: auth.tenantId,
                  type: 'CASE_CREATED',
                  actorType,
                  actorUserId: auth.userId ?? null,
                },
                ...(input.sendImmediately
                  ? [
                      {
                        tenantId: auth.tenantId,
                        type: 'CASE_SENT' as const,
                        actorType,
                        actorUserId: auth.userId ?? null,
                      },
                    ]
                  : []),
              ],
            },
          },
          include: { items: true, customer: true, vehicle: true },
        });
      });

      const body = ok(created);
      if (idemKey) await saveIdempotent(auth.tenantId, idemKey, 201, body, fp);
      return reply.status(201).send(body);
    },
  );

  // --- Detail --------------------------------------------------------------
  app.get(
    '/approval-cases/:id',
    {
      preHandler: app.requirePermission('cases:read'),
      schema: {
        tags: ['approval-cases'],
        summary: 'Get one approval case with items, decisions and audit trail',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };

      const found = await prisma.approvalCase.findFirst({
        // tenantId in the filter is the tenant-isolation guard.
        where: { id, tenantId: auth.tenantId },
        include: {
          items: { orderBy: { sortOrder: 'asc' }, include: { attachments: true } },
          customer: true,
          vehicle: true,
          decisions: { orderBy: { createdAt: 'desc' } },
          auditEvents: { orderBy: { createdAt: 'asc' } },
          attachments: true,
          accessLink: { select: { id: true, expiresAt: true, firstViewedAt: true } },
        },
      });

      if (!found) throw errors.notFound('Approval-Fall nicht gefunden');
      return ok(found);
    },
  );

  // --- Generate / rotate the public customer link --------------------------
  app.post(
    '/approval-cases/:id/generate-public-link',
    {
      preHandler: app.requirePermission('cases:send'),
      schema: {
        tags: ['approval-cases'],
        summary: 'Issue (or rotate) the secure loginless customer link',
        description:
          'Creates a fresh access token, marks the case as SENT (pending customer), writes an audit event and returns the full customer URL. The raw token is returned once and never stored in plaintext.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };

      const found = await prisma.approvalCase.findFirst({
        where: { id, tenantId: auth.tenantId },
        select: { id: true, status: true },
      });
      if (!found) throw errors.notFound('Approval-Fall nicht gefunden');

      const { token, tokenHash } = issueAccessToken();
      const expiresAt = defaultLinkExpiry();

      // Upsert the (1:1) access link, rotating any previous token.
      await prisma.$transaction(async (tx) => {
        await tx.approvalAccessLink.upsert({
          where: { approvalCaseId: id },
          update: { tokenHash, expiresAt, revokedAt: null, firstViewedAt: null },
          create: { tenantId: auth.tenantId, approvalCaseId: id, tokenHash, expiresAt },
        });

        if (found.status === 'DRAFT') {
          await tx.approvalCase.update({
            where: { id },
            data: { status: 'SENT', sentAt: new Date() },
          });
        }

        await tx.auditEvent.create({
          data: {
            tenantId: auth.tenantId,
            approvalCaseId: id,
            type: 'CASE_SENT',
            actorType: auth.userId ? 'USER' : 'SYSTEM',
            actorUserId: auth.userId ?? null,
            metadata: { action: 'approval_link_generated', expiresAt: expiresAt.toISOString() },
          },
        });
      });

      const url = `${config.WEB_BASE_URL}/a/${token}`;
      return reply.status(201).send(ok({ url, token, expiresAt: expiresAt.toISOString() }));
    },
  );

  // --- Send the approval request to the customer ---------------------------
  app.post(
    '/approval-cases/:id/send',
    {
      preHandler: app.requirePermission('cases:send'),
      schema: {
        tags: ['approval-cases'],
        summary: 'Send the approval request (issues link + e-mails the customer)',
        description:
          'Rotates a fresh secure link, e-mails the customer using the initial-request template, moves the case to SENT and records the send in the audit trail and outbound messages. Emits approval_case.sent.',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const c = await loadCaseForMessaging(auth.tenantId, id);

      if (c.status === 'APPROVED' || c.status === 'DECLINED' || c.status === 'EXPIRED') {
        throw errors.caseNotActionable('Dieser Fall ist bereits abgeschlossen und kann nicht gesendet werden.');
      }
      const toAddress = c.customer?.email;
      if (!toAddress) {
        throw errors.validation('Für den E-Mail-Versand fehlt die Kundenadresse.', [
          { path: 'customer.email', message: 'E-Mail-Adresse erforderlich' },
        ]);
      }

      const link = await issueLink(auth.tenantId, id);
      const rendered = await renderCaseTemplate(auth.tenantId, 'approval_request_email', c, link.url);

      const message = await dispatchMessage({
        tenantId: auth.tenantId,
        approvalCaseId: id,
        channel: 'EMAIL',
        toAddress,
        templateKey: 'approval_request_email',
        subject: rendered.subject,
        body: rendered.body,
      });

      await prisma.$transaction([
        prisma.approvalCase.update({
          where: { id },
          data: { status: 'SENT', sentAt: c.sentAt ?? new Date() },
        }),
        prisma.auditEvent.create({
          data: {
            tenantId: auth.tenantId,
            approvalCaseId: id,
            type: 'CASE_SENT',
            actorType: auth.userId ? 'USER' : 'SYSTEM',
            actorUserId: auth.userId ?? null,
            metadata: { channel: 'EMAIL', to: toAddress, messageStatus: message.status },
          },
        }),
      ]);

      await publishEvent({
        type: 'approval_case.sent',
        tenantId: auth.tenantId,
        approvalCaseId: id,
        data: { reference: c.reference, channel: 'EMAIL' },
      });

      return reply.status(200).send(
        ok({ status: 'SENT', channel: 'EMAIL', messageStatus: message.status, link: link.url }),
      );
    },
  );

  // --- Send a reminder -----------------------------------------------------
  app.post(
    '/approval-cases/:id/remind',
    {
      preHandler: app.requirePermission('cases:send'),
      schema: {
        tags: ['approval-cases'],
        summary: 'Send a reminder for a pending case',
        description:
          'Only allowed while a customer response is still expected (SENT/VIEWED/CALLBACK). Rotates the link, e-mails the reminder template, increments the reminder counter and records it. Emits approval_case.reminder_sent.',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const c = await loadCaseForMessaging(auth.tenantId, id);

      if (!isPending(c.status)) {
        throw errors.caseNotActionable(
          'Eine Erinnerung ist nur möglich, solange der Fall auf eine Kundenreaktion wartet.',
        );
      }
      const toAddress = c.customer?.email;
      if (!toAddress) {
        throw errors.validation('Für den E-Mail-Versand fehlt die Kundenadresse.', [
          { path: 'customer.email', message: 'E-Mail-Adresse erforderlich' },
        ]);
      }

      const link = await issueLink(auth.tenantId, id);
      const rendered = await renderCaseTemplate(auth.tenantId, 'approval_reminder_email', c, link.url);

      const message = await dispatchMessage({
        tenantId: auth.tenantId,
        approvalCaseId: id,
        channel: 'EMAIL',
        toAddress,
        templateKey: 'approval_reminder_email',
        subject: rendered.subject,
        body: rendered.body,
      });

      await prisma.$transaction([
        prisma.approvalCase.update({
          where: { id },
          data: { lastReminderAt: new Date(), reminderCount: { increment: 1 } },
        }),
        prisma.auditEvent.create({
          data: {
            tenantId: auth.tenantId,
            approvalCaseId: id,
            type: 'CASE_REMINDER_SENT',
            actorType: auth.userId ? 'USER' : 'SYSTEM',
            actorUserId: auth.userId ?? null,
            metadata: { channel: 'EMAIL', to: toAddress, messageStatus: message.status },
          },
        }),
      ]);

      await publishEvent({
        type: 'approval_case.reminder_sent',
        tenantId: auth.tenantId,
        approvalCaseId: id,
        data: { reference: c.reference, reminderCount: c.reminderCount + 1 },
      });

      return reply.status(200).send(
        ok({ status: c.status, channel: 'EMAIL', messageStatus: message.status, link: link.url }),
      );
    },
  );

  // --- Timeline (human-readable history) -----------------------------------
  app.get(
    '/approval-cases/:id/timeline',
    {
      preHandler: app.requirePermission('cases:read'),
      schema: {
        tags: ['approval-cases'],
        summary: 'Merged, chronological history of a case (audit + messages)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };

      const found = await prisma.approvalCase.findFirst({
        where: { id, tenantId: auth.tenantId },
        select: { id: true },
      });
      if (!found) throw errors.notFound('Approval-Fall nicht gefunden');

      const [events, messages] = await Promise.all([
        prisma.auditEvent.findMany({
          where: { approvalCaseId: id },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.outboundMessage.findMany({
          where: { approvalCaseId: id },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      const timeline = [
        ...events.map((e) => ({
          at: e.createdAt.toISOString(),
          kind: 'audit' as const,
          type: e.type,
          actorType: e.actorType,
          actorLabel: e.actorLabel,
          metadata: e.metadata,
        })),
        ...messages.map((m) => ({
          at: m.createdAt.toISOString(),
          kind: 'message' as const,
          type: `MESSAGE_${m.status}`,
          channel: m.channel,
          to: m.toAddress,
          templateKey: m.templateKey,
        })),
      ].sort((a, b) => a.at.localeCompare(b.at));

      return ok(timeline);
    },
  );
}

// --- Module-level helpers for the messaging flows --------------------------

/** Load a case with everything needed to render + address a message. */
async function loadCaseForMessaging(tenantId: string, id: string) {
  const c = await prisma.approvalCase.findFirst({
    where: { id, tenantId },
    include: {
      items: true,
      customer: true,
      vehicle: true,
      tenant: { select: { name: true, brandName: true, currency: true } },
    },
  });
  if (!c) throw errors.notFound('Approval-Fall nicht gefunden');
  return c;
}

/** Issue a fresh access link for a case and return its public URL. */
async function issueLink(tenantId: string, caseId: string) {
  const { token, tokenHash } = issueAccessToken();
  const expiresAt = defaultLinkExpiry();
  await prisma.approvalAccessLink.upsert({
    where: { approvalCaseId: caseId },
    update: { tokenHash, expiresAt, revokedAt: null, firstViewedAt: null },
    create: { tenantId, approvalCaseId: caseId, tokenHash, expiresAt },
  });
  return { token, expiresAt, url: `${config.WEB_BASE_URL}/a/${token}` };
}

/** Fallback templates used when a tenant hasn't customised one. */
const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  approval_request_email: {
    subject: 'Freigabe angefragt: {{subject}}',
    body: 'Guten Tag {{customerName}}\n\n{{subject}} ({{priceBand}}).\nBitte hier freigeben: {{link}}\n\n{{workspaceName}}',
  },
  approval_reminder_email: {
    subject: 'Erinnerung: {{subject}}',
    body: 'Guten Tag {{customerName}}\n\nErinnerung zu {{subject}} ({{priceBand}}).\n{{link}}\n\n{{workspaceName}}',
  },
};

/** Look up a tenant template (or fall back) and render it for a case. */
async function renderCaseTemplate(
  tenantId: string,
  key: string,
  c: Awaited<ReturnType<typeof loadCaseForMessaging>>,
  linkUrl: string,
) {
  const tpl =
    (await prisma.messageTemplate.findUnique({
      where: { tenantId_key: { tenantId, key } },
      select: { subject: true, body: true },
    })) ?? DEFAULT_TEMPLATES[key] ?? DEFAULT_TEMPLATES.approval_request_email!;

  const ctx = buildCaseContext(c, linkUrl);
  return {
    subject: renderTemplate(tpl.subject ?? '', ctx),
    body: renderTemplate(tpl.body, ctx),
  };
}
