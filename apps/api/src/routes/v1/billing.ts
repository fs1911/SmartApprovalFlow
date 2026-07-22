/**
 * Billing & plan management (Block 11).
 *
 *   GET  /api/v1/billing               plan + usage + available plans (workspace:read)
 *   POST /api/v1/billing/change-plan   change plan (workspace:manage)
 *   POST /api/v1/billing/webhook       provider webhook (signature-verified, idempotent)
 *
 * The `mock` provider applies plan changes immediately; the webhook path lets a
 * real provider (Stripe) drive changes asynchronously and is fully testable
 * locally via a signed request. No external account is required.
 */
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PLANS, PLAN_KEYS } from '@saf/types';
import type { PlanKey } from '@saf/types';
import { prisma } from '@saf/db';
import { config } from '../../config.js';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { getUsage, getSubscription } from '../../lib/usage.js';
import { getBillingProvider, verifyBillingSignature } from '../../lib/billing.js';
import { getIdempotent, saveIdempotent } from '../../lib/idempotency.js';

const changePlanSchema = z.object({ planKey: z.enum(PLAN_KEYS) });

/** Apply a plan change to a tenant's subscription + audit it. */
async function applyPlan(tenantId: string, planKey: PlanKey, actorUserId: string | null, via: string) {
  const before = await getSubscription(tenantId);
  const sub = await prisma.subscription.update({
    where: { tenantId },
    data: { planKey, status: 'ACTIVE' },
  });
  await prisma.auditEvent.create({
    data: {
      tenantId,
      type: 'PLAN_CHANGED',
      actorType: actorUserId ? 'USER' : 'SYSTEM',
      actorUserId,
      metadata: { from: before.planKey, to: planKey, via },
    },
  });
  return sub;
}

export async function billingRoutes(app: FastifyInstance) {
  // --- Read plan + usage ---------------------------------------------------
  app.get(
    '/billing',
    {
      preHandler: app.requirePermission('workspace:read'),
      schema: {
        tags: ['workspace'],
        summary: 'Current plan, usage against limits, and available plans',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const sub = await getSubscription(auth.tenantId);
      const usage = await getUsage(auth.tenantId);
      return ok({
        subscription: {
          planKey: sub.planKey,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart.toISOString(),
        },
        usage,
        plans: PLAN_KEYS.map((k) => PLANS[k]),
        provider: getBillingProvider().name,
      });
    },
  );

  // --- Change plan ---------------------------------------------------------
  app.post(
    '/billing/change-plan',
    {
      preHandler: app.requirePermission('workspace:manage'),
      schema: {
        tags: ['workspace'],
        summary: 'Change the workspace plan (mock: immediate; Stripe: checkout)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { planKey } = changePlanSchema.parse(req.body);

      const session = await getBillingProvider().startPlanChange(auth.tenantId, planKey);
      if (session.applied) {
        // Mock/dev: the change took effect with no external hop.
        await applyPlan(auth.tenantId, planKey, auth.userId ?? null, 'change-plan');
        return reply.status(200).send(ok({ applied: true, planKey }));
      }
      // Real provider: hand back the hosted checkout URL; a webhook confirms later.
      return reply.status(200).send(ok({ applied: false, checkoutUrl: session.url }));
    },
  );

  // --- Provider webhook (signature-verified, idempotent) -------------------
  app.post(
    '/billing/webhook',
    {
      config: { rateLimit: { max: config.RATE_LIMIT_PUBLIC_MAX, timeWindow: config.RATE_LIMIT_WINDOW } },
      schema: {
        tags: ['workspace'],
        summary: 'Billing provider webhook (verifies signature; applies plan changes)',
        description:
          'Accepts a signed `subscription.updated` event { id, tenantId, planKey }. Locally testable by signing with BILLING_WEBHOOK_SECRET (HMAC-SHA256, header X-SAF-Billing-Signature).',
      },
    },
    async (req, reply) => {
      const raw = JSON.stringify(req.body ?? {});
      const signature = (req.headers['x-saf-billing-signature'] as string) ?? '';
      if (!verifyBillingSignature(config.BILLING_WEBHOOK_SECRET, raw, signature)) {
        throw errors.validation('Ungültige Webhook-Signatur.');
      }

      const event = req.body as { id?: string; type?: string; tenantId?: string; planKey?: PlanKey };
      if (!event.id || !event.tenantId || event.type !== 'subscription.updated' || !event.planKey) {
        throw errors.validation('Unvollständiges Webhook-Event.');
      }
      if (!PLAN_KEYS.includes(event.planKey)) {
        throw errors.validation('Unbekannter Plan im Event.');
      }

      const tenant = await prisma.tenant.findUnique({ where: { id: event.tenantId }, select: { id: true } });
      if (!tenant) throw errors.notFound('Tenant nicht gefunden');

      // Idempotency: a provider may deliver the same event more than once.
      const fp = createHash('sha256').update(raw).digest('hex');
      const prior = await getIdempotent(event.tenantId, `billing:${event.id}`);
      if (prior) return reply.status(prior.statusCode).send(prior.body);

      await getSubscription(event.tenantId); // ensure a row exists
      await applyPlan(event.tenantId, event.planKey, null, 'webhook');

      const body = ok({ received: true, planKey: event.planKey });
      await saveIdempotent(event.tenantId, `billing:${event.id}`, 200, body, fp);
      return reply.status(200).send(body);
    },
  );
}
