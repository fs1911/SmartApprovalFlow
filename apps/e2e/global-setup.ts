/**
 * Playwright global setup.
 *
 * Seeds the database with fresh approval cases whose loginless tokens we know
 * up front, then writes them to `.fixtures.json` for the specs to read. Runs
 * once before the suite, against the same DATABASE_URL the API server uses.
 *
 * Everything here is local: no external accounts, no network. The demo tenant
 * (slug `muster-garage`) is created by the standard seed, which CI runs before
 * the E2E job; we look it up and attach new cases to it.
 */
import { prisma } from '@saf/db';
import { createHash, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES_PATH = path.join(currentDir, '.fixtures.json');

/** Mirrors apps/api/src/lib/access-link.ts — the raw token is never stored. */
function issueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: createHash('sha256').update(token).digest('hex') };
}

export interface E2EFixtures {
  /** Each decision spec gets its own pristine case so state never collides. */
  approveToken: string;
  declineToken: string;
  callbackToken: string;
  individualToken: string;
  /** Read-only case for the localization rendering checks (never submitted). */
  localeToken: string;
  /** A case whose link is already expired → expired error state. */
  expiredToken: string;
  /** A syntactically valid token that matches no link → invalid state. */
  invalidToken: string;
}

interface SeedOptions {
  reference: string;
  subject: string;
  expiresAt: Date | null;
}

async function seedCase(tenantId: string, opts: SeedOptions): Promise<string> {
  const { token, tokenHash } = issueToken();

  const customer = await prisma.customer.create({
    data: { tenantId, name: 'E2E Kundin', email: 'e2e@example.ch', phone: '+41 79 000 00 00' },
  });
  const vehicle = await prisma.vehicle.create({
    data: { tenantId, customerId: customer.id, plate: 'ZH 999 999', make: 'VW', model: 'Golf', year: 2019 },
  });

  await prisma.approvalCase.create({
    data: {
      tenantId,
      reference: opts.reference,
      subject: opts.subject,
      description: 'Automatischer E2E-Testfall.',
      status: 'SENT',
      urgency: 'HIGH',
      customerId: customer.id,
      vehicleId: vehicle.id,
      sentAt: new Date(),
      expiresAt: opts.expiresAt,
      items: {
        create: [
          {
            tenantId,
            title: 'Bremsbeläge vorne ersetzen',
            description: 'Beläge unter Verschleissgrenze.',
            category: 'SAFETY',
            priceMinMinor: 18000,
            priceMaxMinor: 24000,
            currency: 'CHF',
            sortOrder: 0,
          },
          {
            tenantId,
            title: 'Bremsscheiben vorne ersetzen',
            category: 'REPAIR',
            priceMinMinor: 22000,
            priceMaxMinor: 30000,
            currency: 'CHF',
            sortOrder: 1,
          },
        ],
      },
      accessLink: { create: { tenantId, tokenHash, expiresAt: opts.expiresAt } },
    },
  });

  return token;
}

async function globalSetup(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'muster-garage' }, select: { id: true } });
  if (!tenant) {
    throw new Error(
      'E2E setup: demo tenant "muster-garage" not found. Run `npm run seed --workspace packages/db` first.',
    );
  }

  // Unique per run so re-runs never hit the per-tenant reference constraint.
  const stamp = Date.now().toString(36).toUpperCase();
  const future = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  const past = new Date(Date.now() - 60 * 1000);

  const fixtures: E2EFixtures = {
    approveToken: await seedCase(tenant.id, { reference: `E2E-${stamp}-AP`, subject: 'E2E Freigabe', expiresAt: future }),
    declineToken: await seedCase(tenant.id, { reference: `E2E-${stamp}-DE`, subject: 'E2E Ablehnung', expiresAt: future }),
    callbackToken: await seedCase(tenant.id, { reference: `E2E-${stamp}-CB`, subject: 'E2E Rückruf', expiresAt: future }),
    individualToken: await seedCase(tenant.id, { reference: `E2E-${stamp}-IN`, subject: 'E2E Einzeln', expiresAt: future }),
    localeToken: await seedCase(tenant.id, { reference: `E2E-${stamp}-LO`, subject: 'E2E Sprache', expiresAt: future }),
    expiredToken: await seedCase(tenant.id, { reference: `E2E-${stamp}-EX`, subject: 'E2E Abgelaufen', expiresAt: past }),
    invalidToken: randomBytes(32).toString('base64url'),
  };

  writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2));
  await prisma.$disconnect();
}

export default globalSetup;
