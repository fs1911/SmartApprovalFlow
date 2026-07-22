/**
 * Seed a realistic demo workspace so the app is browsable immediately.
 * Idempotent: safe to run repeatedly (upserts by natural keys).
 *
 * Run with: npm run seed --workspace packages/db
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

/**
 * Password hash format `scrypt$<saltHex>$<hashHex>` — mirrors
 * apps/api/src/lib/password.ts so seeded dev users can log in.
 * All seeded users share the dev password below.
 */
const DEV_PASSWORD = 'password123';
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'muster-garage' },
    // Keep branding/contact in sync on re-seed so new fields backfill.
    update: {
      brandColor: '#1f5fa8',
      contactEmail: 'service@muster-garage.ch',
      contactPhone: '+41 44 000 00 00',
    },
    create: {
      slug: 'muster-garage',
      name: 'Muster Garage AG',
      brandName: 'Muster Garage',
      brandColor: '#1f5fa8',
      contactEmail: 'service@muster-garage.ch',
      contactPhone: '+41 44 000 00 00',
      locale: 'de-CH',
      timezone: 'Europe/Zurich',
      currency: 'CHF',
    },
  });

  const owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@muster-garage.ch' } },
    update: { passwordHash: hashPassword(DEV_PASSWORD) },
    create: {
      tenantId: tenant.id,
      email: 'owner@muster-garage.ch',
      name: 'Sandra Muster',
      passwordHash: hashPassword(DEV_PASSWORD),
    },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: { role: 'OWNER' },
    create: { tenantId: tenant.id, userId: owner.id, role: 'OWNER' },
  });

  const advisor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'berater@muster-garage.ch' } },
    update: { passwordHash: hashPassword(DEV_PASSWORD) },
    create: {
      tenantId: tenant.id,
      email: 'berater@muster-garage.ch',
      name: 'Marco Kunz',
      passwordHash: hashPassword(DEV_PASSWORD),
    },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: advisor.id } },
    update: { role: 'SERVICE_ADVISOR' },
    create: { tenantId: tenant.id, userId: advisor.id, role: 'SERVICE_ADVISOR' },
  });

  // A technician and a viewer so the members admin has realistic content.
  for (const [email, name, role] of [
    ['technik@muster-garage.ch', 'Luka Weber', 'TECHNICIAN'],
    ['einblick@muster-garage.ch', 'Nina Betrachter', 'VIEWER'],
  ] as const) {
    const u = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: { passwordHash: hashPassword(DEV_PASSWORD) },
      create: { tenantId: tenant.id, email, name, passwordHash: hashPassword(DEV_PASSWORD) },
    });
    await prisma.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: u.id } },
      update: { role },
      create: { tenantId: tenant.id, userId: u.id, role },
    });
  }

  // Sample case is created only once (idempotent re-seed): keyed on its
  // per-tenant reference. Re-running the seed then only refreshes templates etc.
  const sampleRef = 'AC-2026-0001';
  const sampleExists = await prisma.approvalCase.findUnique({
    where: { tenantId_reference: { tenantId: tenant.id, reference: sampleRef } },
    select: { id: true },
  });

  if (!sampleExists) {
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
        reference: sampleRef,
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
  }

  // Default customer-facing message templates.
  await prisma.messageTemplate.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'approval_request_email' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'approval_request_email',
      channel: 'EMAIL',
      subject: 'Freigabe angefragt: {{subject}}',
      body: [
        'Guten Tag {{customerName}}',
        '',
        'An Ihrem Fahrzeug {{vehicle}} haben wir folgende Arbeit festgestellt:',
        '{{subject}}',
        '',
        'Voraussichtliche Kosten: {{priceBand}}',
        '',
        'Bitte prüfen und freigeben – ganz einfach online, ohne Login:',
        '{{link}}',
        '',
        'Bei Fragen erreichen Sie uns unter {{workspaceContact}}.',
        'Freundliche Grüsse',
        '{{workspaceName}}',
      ].join('\n'),
      isDefault: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'approval_reminder_email' } },
    update: {},
    create: {
      tenantId: tenant.id,
      key: 'approval_reminder_email',
      channel: 'EMAIL',
      subject: 'Erinnerung: Ihre Freigabe für {{subject}}',
      body: [
        'Guten Tag {{customerName}}',
        '',
        'Wir möchten Sie freundlich an unsere offene Anfrage zu Ihrem Fahrzeug',
        '{{vehicle}} erinnern: {{subject}} ({{priceBand}}).',
        '',
        'Ihre Rückmeldung genügt mit einem Klick:',
        '{{link}}',
        '',
        'Freundliche Grüsse',
        '{{workspaceName}}',
      ].join('\n'),
      isDefault: true,
    },
  });

  // Prepared (inactive) demo webhook endpoint for integration readiness.
  const existingHook = await prisma.webhookEndpoint.findFirst({
    where: { tenantId: tenant.id, url: 'https://example.com/webhooks/saf' },
  });
  if (!existingHook) {
    await prisma.webhookEndpoint.create({
      data: {
        tenantId: tenant.id,
        url: 'https://example.com/webhooks/saf',
        secret: 'whsec_demo_do_not_use',
        events: '',
        isActive: false,
      },
    });
  }

  console.log('✅ Seed complete for tenant:', tenant.slug);
  console.log(`   Dev-Login: owner@muster-garage.ch / ${DEV_PASSWORD} (alle Seed-User)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
