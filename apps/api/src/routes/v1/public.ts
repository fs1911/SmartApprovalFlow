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
import { customerRespondSchema } from '@saf/types';
import type { ApprovalCaseStatus, CustomerDecision } from '@saf/types';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { hashToken } from '../../lib/access-link.js';
import { getIdempotent, saveIdempotent } from '../../lib/idempotency.js';

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
          items: { orderBy: { sortOrder: 'asc' } },
          customer: { select: { name: true } },
          vehicle: { select: { plate: true, make: true, model: true, year: true } },
          tenant: { select: { name: true, brandName: true, currency: true, locale: true } },
        },
      },
    },
  });

  if (!link) throw errors.tokenInvalid();
  if (link.revokedAt) throw errors.tokenInvalid('Link wurde zurückgezogen');
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) throw errors.tokenExpired();
  return link;
}

/** Shape returned to the customer — deliberately minimal and non-technical. */
function toPublicView(link: Awaited<ReturnType<typeof resolveByToken>>) {
  const c = link.approvalCase;
  return {
    reference: c.reference,
    subject: c.subject,
    description: c.description,
    urgency: c.urgency,
    status: c.status,
    workspace: {
      name: c.tenant.brandName ?? c.tenant.name,
      currency: c.tenant.currency,
    },
    customerName: c.customer?.name ?? null,
    vehicle: c.vehicle
      ? [c.vehicle.make, c.vehicle.model, c.vehicle.year].filter(Boolean).join(' ') ||
        c.vehicle.plate
      : null,
    vehiclePlate: c.vehicle?.plate ?? null,
    items: c.items.map((it) => ({
      title: it.title,
      description: it.description,
      category: it.category,
      priceMinMinor: it.priceMinMinor,
      priceMaxMinor: it.priceMaxMinor,
      currency: it.currency,
    })),
    priceMinMinor: c.items.reduce((s, it) => s + (it.priceMinMinor ?? 0), 0) || null,
    priceMaxMinor: c.items.reduce((s, it) => s + (it.priceMaxMinor ?? 0), 0) || null,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    respondedAt:
      c.status === 'APPROVED' || c.status === 'DECLINED' || c.status === 'CALLBACK'
        ? c.updatedAt.toISOString()
        : null,
  };
}

export async function publicRoutes(app: FastifyInstance) {
  // --- Read the request ----------------------------------------------------
  app.get(
    '/public/approvals/:token',
    {
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
        await prisma.$transaction(async (tx) => {
          await tx.approvalAccessLink.update({
            where: { id: link.id },
            data: { firstViewedAt: new Date() },
          });
          if (link.approvalCase.status === 'SENT') {
            await tx.approvalCase.update({
              where: { id: link.approvalCaseId },
              data: { status: 'VIEWED' },
            });
          }
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
      }

      return ok(toPublicView(link));
    },
  );

  // --- Submit a decision ---------------------------------------------------
  app.post(
    '/public/approvals/:token/respond',
    {
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
        const prior = getIdempotent(`resp:${c.id}:${idemKey}`);
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

        await tx.approvalCase.update({ where: { id: c.id }, data: { status: newStatus } });

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

      const responseBody = ok({
        status: newStatus,
        decision: result.decision,
        respondedAt: result.createdAt.toISOString(),
      });
      if (idemKey) saveIdempotent(`resp:${c.id}:${idemKey}`, 200, responseBody, fp);
      return reply.status(200).send(responseBody);
    },
  );
}
