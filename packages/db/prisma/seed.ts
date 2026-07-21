/**
 * Seed a realistic demo workspace so the app is browsable immediately.
 * Idempotent: safe to run repeatedly (upserts by natural keys).
 *
 * Run with: npm run seed --workspace packages/db
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'muster-garage' },
    update: {},
    create: {
      slug: 'muster-garage',
      name: 'Muster Garage AG',
      brandName: 'Muster Garage',
      locale: 'de-CH',
      timezone: 'Europe/Zurich',
      currency: 'CHF',
    },
  });

  const owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@muster-garage.ch' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'owner@muster-garage.ch',
      name: 'Sandra Muster',
    },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: { role: 'OWNER' },
    create: { tenantId: tenant.id, userId: owner.id, role: 'OWNER' },
  });

  const advisor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'berater@muster-garage.ch' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'berater@muster-garage.ch',
      name: 'Marco Kunz',
    },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: advisor.id } },
    update: { role: 'SERVICE_ADVISOR' },
    create: { tenantId: tenant.id, userId: advisor.id, role: 'SERVICE_ADVISOR' },
  });

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Peter Beispiel',
      email: 'peter.beispiel@example.ch',
      phone: '+41 79 123 45 67',
    },
  });

  const vehicle = await prisma.vehicle.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      plate: 'ZH 123 456',
      make: 'VW',
      model: 'Golf',
      year: 2018,
    },
  });

  await prisma.approvalCase.create({
    data: {
      tenantId: tenant.id,
      reference: 'AC-2026-0001',
      subject: 'Bremsbeläge hinten + Bremsscheiben',
      description:
        'Bei der Inspektion festgestellt: Bremsbeläge hinten unter Minimum, Bremsscheiben mit Riefen.',
      status: 'SENT',
      urgency: 'HIGH',
      customerId: customer.id,
      vehicleId: vehicle.id,
      createdById: advisor.id,
      sentAt: new Date(),
      items: {
        create: [
          {
            tenantId: tenant.id,
            title: 'Bremsbeläge hinten ersetzen',
            description: 'Beläge unter Verschleissgrenze.',
            category: 'SAFETY',
            priceMinMinor: 18000,
            priceMaxMinor: 24000,
            currency: 'CHF',
            sortOrder: 0,
          },
          {
            tenantId: tenant.id,
            title: 'Bremsscheiben hinten ersetzen',
            category: 'REPAIR',
            priceMinMinor: 22000,
            priceMaxMinor: 30000,
            currency: 'CHF',
            sortOrder: 1,
          },
        ],
      },
      auditEvents: {
        create: [
          {
            tenantId: tenant.id,
            type: 'CASE_CREATED',
            actorType: 'USER',
            actorUserId: advisor.id,
            actorLabel: advisor.name,
          },
          {
            tenantId: tenant.id,
            type: 'CASE_SENT',
            actorType: 'USER',
            actorUserId: advisor.id,
            actorLabel: advisor.name,
            metadata: { channel: 'EMAIL' },
          },
        ],
      },
    },
  });

  // Default customer-facing message templates (used from Block 4 onward).
  await prisma.messageTemplate.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'approval_request_email' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'approval_request_email',
      channel: 'EMAIL',
      subject: 'Freigabe angefragt: {{subject}}',
      body: 'Guten Tag {{customerName}}\n\nWir haben an Ihrem Fahrzeug {{vehicle}} folgende Arbeiten festgestellt. Bitte prüfen und freigeben: {{link}}',
      isDefault: true,
    },
  });

  console.log('✅ Seed complete for tenant:', tenant.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
