/**
 * Onboarding & activation (Block 10).
 *
 *   GET  /api/v1/onboarding              checklist + activation (workspace:read)
 *   POST /api/v1/onboarding/sample-case  create a demo case      (cases:create)
 *
 * The checklist is derived from existing tenant state (no stored progress flags),
 * so it is always accurate and needs no backfill.
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { computeOnboarding, type OnboardingSignals } from '../../lib/onboarding.js';

async function gatherSignals(tenantId: string): Promise<OnboardingSignals> {
  const [tenant, memberCount, caseCount, sentCount, responseCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { brandName: true, brandColor: true, contactEmail: true, contactPhone: true },
    }),
    prisma.membership.count({ where: { tenantId } }),
    prisma.approvalCase.count({ where: { tenantId } }),
    prisma.approvalCase.count({ where: { tenantId, sentAt: { not: null } } }),
    prisma.approvalCase.count({ where: { tenantId, respondedAt: { not: null } } }),
  ]);

  const hasBranding = !!(
    tenant &&
    (tenant.brandName || tenant.brandColor || tenant.contactEmail || tenant.contactPhone)
  );
  return {
    hasBranding,
    hasTeam: memberCount > 1,
    hasCase: caseCount > 0,
    hasSentCase: sentCount > 0,
    hasResponse: responseCount > 0,
  };
}

export async function onboardingRoutes(app: FastifyInstance) {
  app.get(
    '/onboarding',
    {
      preHandler: app.requirePermission('workspace:read'),
      schema: {
        tags: ['workspace'],
        summary: 'Onboarding checklist + activation signals for the workspace',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const signals = await gatherSignals(auth.tenantId);
      return ok({ ...computeOnboarding(signals), signals });
    },
  );

  app.post(
    '/onboarding/sample-case',
    {
      preHandler: app.requirePermission('cases:create'),
      schema: {
        tags: ['workspace'],
        summary: 'Create a risk-free sample approval case to try the flow',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const year = new Date().getFullYear();
      const count = await prisma.approvalCase.count({ where: { tenantId: auth.tenantId } });
      const reference = `AC-${year}-${String(count + 1).padStart(4, '0')}`;

      const created = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: { tenantId: auth.tenantId, name: 'Beispiel Kundin', email: 'beispiel@kunde.example' },
        });
        return tx.approvalCase.create({
          data: {
            tenantId: auth.tenantId,
            reference,
            subject: 'Beispiel: Bremsbeläge vorne ersetzen',
            description: 'Dies ist ein Beispiel-Fall zum Ausprobieren. Sie können ihn gefahrlos senden oder löschen.',
            urgency: 'MEDIUM',
            status: 'DRAFT',
            createdById: auth.userId ?? null,
            customerId: customer.id,
            items: {
              create: [
                {
                  tenantId: auth.tenantId,
                  title: 'Bremsbeläge vorne ersetzen',
                  description: 'Beläge unter Verschleissgrenze — Ersatz empfohlen.',
                  category: 'SAFETY',
                  priceMinMinor: 18000,
                  priceMaxMinor: 24000,
                  currency: 'CHF',
                  sortOrder: 0,
                },
              ],
            },
            auditEvents: {
              create: [
                {
                  tenantId: auth.tenantId,
                  type: 'CASE_CREATED',
                  actorType: auth.userId ? 'USER' : 'SYSTEM',
                  actorUserId: auth.userId ?? null,
                  metadata: { sample: true },
                },
              ],
            },
          },
          include: { items: true, customer: true },
        });
      });

      return reply.status(201).send(ok(created));
    },
  );
}
