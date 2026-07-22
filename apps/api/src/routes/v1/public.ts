/**
 * Public, loginless customer endpoints.
 *
 *   GET  /api/v1/public/approvals/:token           read the request (safe)
 *   POST /api/v1/public/approvals/:token/respond   submit a decision (idempotent)
 *
 * These endpoints MUST NOT use app.requireAuth. Authorisation is the possession
 * of the unguessable token. We only ever expose customer-safe fields — never
 * internal notes, audit trail, other cases or tenant internals.
 */
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { customerRespondSchema, customerRespondItemsSchema } from '@saf/types';
import type { ApprovalCaseStatus, CustomerDecision } from '@saf/types';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { hashToken } from '../../lib/access-link.js';
import { getIdempotent, saveIdempotent } from '../../lib/idempotency.js';
import { publishEvent } from '../../lib/events.js';
import { isTerminal, aggregateItemDecisions } from '../../lib/status.js';
import { getStorageDriver } from '../../lib/storage.js';
import { config } from '../../config.js';

/** Tighter rate limit for the loginless public endpoints. */
const publicRateLimit = {
  rateLimit: { max: config.RATE_LIMIT_PUBLIC_MAX, timeWindow: config.RATE_LIMIT_WINDOW },
};

/** Map a customer decision to the resulting case status. */
const DECISION_TO_STATUS: Record<CustomerDecision, ApprovalCaseStatus> = {
  APPROVE: 'APPROVED',
  DECLINE: 'DECLINED',
  CALLBACK: 'CALLBACK',
};

const DECISION_TO_AUDIT = {
  APPROVE: 'CASE_APPROVED',
  DECLINE: 'CASE_DECLINED',
  CALLBACK: 'CASE_CALLBACK_REQUESTED',
} as const;

/** Resolve a case from a raw token, enforcing validity. */
async function resolveByToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const link = await prisma.approvalAccessLink.findUnique({
    where: { tokenHash },
    include: {
      approvalCase: {
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              attachments: {
                where: { uploadedAt: { not: null } },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
          customer: { select: { name: true } },
          vehicle: { select: { plate: true, make: true, model: true, year: true } },
          tenant: {
            select: {
              name: true,
              brandName: true,
              brandColor: true,
              contactEmail: true,
              contactPhone: true,
              currency: true,
              locale: true,
            },
          },
        },
      },
    },
  });

  if (!link) throw errors.tokenInvalid();
  if (link.revokedAt) throw errors.tokenInvalid('Link wurde zurückgezogen');

  // Lazy expiry: if the window elapsed, transition the case to EXPIRED (once)
  // and record it, then reject. No background job needed for the MVP.
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    if (!isTerminal(link.approvalCase.status)) {
      await prisma.$transaction([
        prisma.approvalCase.update({ where: { id: link.approvalCaseId }, data: { status: 'EXPIRED' } }),
        prisma.auditEvent.create({
          data: {
            tenantId: link.tenantId,
            approvalCaseId: link.approvalCaseId,
            type: 'CASE_EXPIRED',
            actorType: 'SYSTEM',
            actorLabel: 'system',
            metadata: { action: 'status_changed', from: link.approvalCase.status, to: 'EXPIRED' },
          },
        }),
      ]);
      await publishEvent({
        type: 'approval_case.expired',
        tenantId: link.tenantId,
        approvalCaseId: link.approvalCaseId,
        data: { reference: link.approvalCase.reference },
      });
    }
    throw errors.tokenExpired();
  }
  return link;
}

/** Shape returned to the customer — deliberately minimal and non-technical. */
async function toPublicView(link: Awaited<ReturnType<typeof resolveByToken>>) {
  const c = link.approvalCase;
  const driver = getStorageDriver();

  // Resolve signed photo URLs per position. Only uploaded attachments are
  // included (the include already filters on uploadedAt).
  const items = await Promise.all(
    c.items.map(async (it) => ({
      id: it.id,
      title: it.title,
      description: it.description,
      category: it.category,
      priceMinMinor: it.priceMinMinor,
      priceMaxMinor: it.priceMaxMinor,
      currency: it.currency,
      decision: it.decision,
      photos: await Promise.all(
        it.attachments.map(async (a) => ({
          fileName: a.fileName,
          contentType: a.contentType,
          url: await driver.getSignedDownloadUrl(a.storageKey),
        })),
      ),
    })),
  );

  return {
    reference: c.reference,
    subject: c.subject,
    description: c.description,
    urgency: c.urgency,
    status: c.status,
    workspace: {
      name: c.tenant.brandName ?? c.tenant.name,
      currency: c.tenant.currency,
      brandColor: c.tenant.brandColor,
      contactEmail: c.tenant.contactEmail,
      contactPhone: c.tenant.contactPhone,
    },
    customerName: c.customer?.name ?? null,
    vehicle: c.vehicle
      ? [c.vehicle.make, c.vehicle.model, c.vehicle.year].filter(Boolean).join(' ') ||
        c.vehicle.plate
      : null,
    vehiclePlate: c.vehicle?.plate ?? null,
    items,
    priceMinMinor: c.items.reduce((s, it) => s + (it.priceMinMinor ?? 0), 0) || null,
    priceMaxMinor: c.items.reduce((s, it) => s + (it.priceMaxMinor ?? 0), 0) || null,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    respondedAt: c.respondedAt?.toISOString() ?? null,
  };
}

export async function publicRoutes(app: FastifyInstance) {
  // --- Read the request ----------------------------------------------------
  app.get(
    '/public/approvals/:token',
    {
      config: publicRateLimit,
      schema: {
        tags: ['public'],
        summary: 'Read an approval request via its secure token (no login)',
        params: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] },
      },
    },
    async (req) => {
      const { token } = req.params as { token: string };
      const link = await resolveByToken(token);

      // Record the first view (soft signal) without downgrading a real decision.
      if (!link.firstViewedAt) {
        const now = new Date();
        await prisma.$transaction(async (tx) => {
          await tx.approvalAccessLink.update({
            where: { id: link.id },
            data: { firstViewedAt: now },
          });
          await tx.approvalCase.update({
            where: { id: link.approvalCaseId },
            data: {
              openedAt: now,
              // Only advance SENT → VIEWED; never override a real decision.
              ...(link.approvalCase.status === 'SENT' ? { status: 'VIEWED' } : {}),
            },
          });
          await tx.auditEvent.create({
            data: {
              tenantId: link.tenantId,
              approvalCaseId: link.approvalCaseId,
              type: 'CASE_LINK_VIEWED',
              actorType: 'CUSTOMER',
              actorLabel: link.approvalCase.customer?.name ?? 'Kunde',
            },
          });
        });
        await publishEvent({
          type: 'approval_case.viewed',
          tenantId: link.tenantId,
          approvalCaseId: link.approvalCaseId,
          data: { reference: link.approvalCase.reference },
        });
        // Reflect the transition in the response we return below.
        if (link.approvalCase.status === 'SENT') link.approvalCase.status = 'VIEWED';
      }

      return ok(await toPublicView(link));
    },
  );

  // --- Submit a decision ---------------------------------------------------
  app.post(
    '/public/approvals/:token/respond',
    {
      config: publicRateLimit,
      schema: {
        tags: ['public'],
        summary: 'Submit a customer decision (approve / decline / callback)',
        description:
          'Loginless. Idempotent via the optional Idempotency-Key header so a double-tap on mobile does not create two decisions.',
        params: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] },
      },
    },
    async (req, reply) => {
      const { token } = req.params as { token: string };
      const body = customerRespondSchema.parse(req.body);
      const link = await resolveByToken(token);
      const c = link.approvalCase;

      // A case that already reached a final yes/no cannot be re-decided.
      if (c.status === 'APPROVED' || c.status === 'DECLINED') {
        throw errors.caseNotActionable('Für diese Anfrage wurde bereits entschieden.');
      }

      const idemKey = req.headers['idempotency-key'] as string | undefined;
      const fp = createHash('sha256').update(JSON.stringify({ id: c.id, body })).digest('hex');
      if (idemKey) {
        const prior = await getIdempotent(link.tenantId, `resp:${c.id}:${idemKey}`);
        if (prior) {
          if (prior.fingerprint !== fp) throw errors.idempotencyReuse();
          return reply.status(prior.statusCode).send(prior.body);
        }
      }

      const newStatus = DECISION_TO_STATUS[body.decision];

      const result = await prisma.$transaction(async (tx) => {
        const decision = await tx.approvalDecision.create({
          data: {
            tenantId: link.tenantId,
            approvalCaseId: c.id,
            decision: body.decision,
            note: body.note,
            callbackPhone: body.callbackPhone,
            ipAddress: (req.headers['x-forwarded-for'] as string) ?? req.ip,
            userAgent: req.headers['user-agent'] as string | undefined,
          },
        });

        await tx.approvalCase.update({
          where: { id: c.id },
          data: {
            status: newStatus,
            // A final decision (approve/decline) stamps respondedAt.
            ...(newStatus === 'APPROVED' || newStatus === 'DECLINED'
              ? { respondedAt: new Date() }
              : {}),
          },
        });

        // Two audit events: the customer action + the resulting status change.
        await tx.auditEvent.createMany({
          data: [
            {
              tenantId: link.tenantId,
              approvalCaseId: c.id,
              type: DECISION_TO_AUDIT[body.decision],
              actorType: 'CUSTOMER',
              actorLabel: c.customer?.name ?? 'Kunde',
              metadata: { note: body.note ?? null },
            },
            {
              tenantId: link.tenantId,
              approvalCaseId: c.id,
              type:
                newStatus === 'APPROVED'
                  ? 'CASE_APPROVED'
                  : newStatus === 'DECLINED'
                    ? 'CASE_DECLINED'
                    : 'CASE_CALLBACK_REQUESTED',
              actorType: 'SYSTEM',
              actorLabel: 'system',
              metadata: { action: 'status_changed', from: c.status, to: newStatus },
            },
          ],
        });

        return decision;
      });

      // Emit domain events: the generic "responded" plus the specific outcome.
      const specificEvent =
        body.decision === 'APPROVE'
          ? 'approval_case.approved'
          : body.decision === 'DECLINE'
            ? 'approval_case.declined'
            : 'approval_case.callback_requested';
      await publishEvent({
        type: 'approval_case.responded',
        tenantId: link.tenantId,
        approvalCaseId: c.id,
        data: { reference: c.reference, decision: body.decision, status: newStatus },
      });
      await publishEvent({
        type: specificEvent,
        tenantId: link.tenantId,
        approvalCaseId: c.id,
        data: { reference: c.reference },
      });

      const responseBody = ok({
        status: newStatus,
        decision: result.decision,
        respondedAt: result.createdAt.toISOString(),
      });
      if (idemKey) await saveIdempotent(link.tenantId, `resp:${c.id}:${idemKey}`, 200, responseBody, fp);
      return reply.status(200).send(responseBody);
    },
  );

  // --- Submit per-item decisions (optional individual approval) ------------
  app.post(
    '/public/approvals/:token/respond-items',
    {
      config: publicRateLimit,
      schema: {
        tags: ['public'],
        summary: 'Submit per-position customer decisions (individual approval)',
        description:
          'Loginless. The customer decides each position; the case status is aggregated server-side (APPROVED / PARTIALLY_APPROVED / DECLINED / CALLBACK). Idempotent via the optional Idempotency-Key header.',
        params: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] },
      },
    },
    async (req, reply) => {
      const { token } = req.params as { token: string };
      const body = customerRespondItemsSchema.parse(req.body);
      const link = await resolveByToken(token);
      const c = link.approvalCase;

      if (c.status === 'APPROVED' || c.status === 'DECLINED' || c.status === 'PARTIALLY_APPROVED') {
        throw errors.caseNotActionable('Für diese Anfrage wurde bereits entschieden.');
      }

      // Every referenced item must belong to this case.
      const validIds = new Set(c.items.map((it) => it.id));
      for (const d of body.items) {
        if (!validIds.has(d.itemId)) {
          throw errors.validation('Unbekannte Position in der Antwort.', [
            { path: 'items', message: `Position ${d.itemId} gehört nicht zu diesem Fall` },
          ]);
        }
      }

      const idemKey = req.headers['idempotency-key'] as string | undefined;
      const fp = createHash('sha256').update(JSON.stringify({ id: c.id, body })).digest('hex');
      if (idemKey) {
        const prior = await getIdempotent(link.tenantId, `respitems:${c.id}:${idemKey}`);
        if (prior) {
          if (prior.fingerprint !== fp) throw errors.idempotencyReuse();
          return reply.status(prior.statusCode).send(prior.body);
        }
      }

      const newStatus = aggregateItemDecisions(body.items.map((d) => d.decision));
      const isFinal = newStatus === 'APPROVED' || newStatus === 'DECLINED' || newStatus === 'PARTIALLY_APPROVED';
      const now = new Date();

      await prisma.$transaction(async (tx) => {
        for (const d of body.items) {
          await tx.approvalDecision.create({
            data: {
              tenantId: link.tenantId,
              approvalCaseId: c.id,
              approvalItemId: d.itemId,
              decision: d.decision,
              note: body.note,
              callbackPhone: body.callbackPhone,
              ipAddress: (req.headers['x-forwarded-for'] as string) ?? req.ip,
              userAgent: req.headers['user-agent'] as string | undefined,
            },
          });
          await tx.approvalItem.update({
            where: { id: d.itemId },
            data: { decision: d.decision, decidedAt: now },
          });
          await tx.auditEvent.create({
            data: {
              tenantId: link.tenantId,
              approvalCaseId: c.id,
              type: 'CASE_ITEM_DECIDED',
              actorType: 'CUSTOMER',
              actorLabel: c.customer?.name ?? 'Kunde',
              metadata: { itemId: d.itemId, decision: d.decision },
            },
          });
        }

        await tx.approvalCase.update({
          where: { id: c.id },
          data: { status: newStatus, ...(isFinal ? { respondedAt: now } : {}) },
        });

        await tx.auditEvent.create({
          data: {
            tenantId: link.tenantId,
            approvalCaseId: c.id,
            type:
              newStatus === 'APPROVED'
                ? 'CASE_APPROVED'
                : newStatus === 'PARTIALLY_APPROVED'
                  ? 'CASE_PARTIALLY_APPROVED'
                  : newStatus === 'DECLINED'
                    ? 'CASE_DECLINED'
                    : 'CASE_CALLBACK_REQUESTED',
            actorType: 'SYSTEM',
            actorLabel: 'system',
            metadata: { action: 'status_changed', from: c.status, to: newStatus, mode: 'per-item' },
          },
        });
      });

      const specificEvent =
        newStatus === 'APPROVED'
          ? 'approval_case.approved'
          : newStatus === 'PARTIALLY_APPROVED'
            ? 'approval_case.partially_approved'
            : newStatus === 'DECLINED'
              ? 'approval_case.declined'
              : 'approval_case.callback_requested';
      await publishEvent({
        type: 'approval_case.responded',
        tenantId: link.tenantId,
        approvalCaseId: c.id,
        data: { reference: c.reference, status: newStatus, mode: 'per-item' },
      });
      await publishEvent({
        type: specificEvent,
        tenantId: link.tenantId,
        approvalCaseId: c.id,
        data: { reference: c.reference },
      });

      const responseBody = ok({
        status: newStatus,
        respondedAt: isFinal ? now.toISOString() : null,
        items: body.items,
      });
      if (idemKey) {
        await saveIdempotent(link.tenantId, `respitems:${c.id}:${idemKey}`, 200, responseBody, fp);
      }
      return reply.status(200).send(responseBody);
    },
  );
}
