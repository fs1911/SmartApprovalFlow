/**
 * Production bootstrap: create the FIRST real workspace + owner login from
 * environment variables — no demo data, no shell/CLI needed.
 *
 * Runs on every deploy (see apps/api/Dockerfile `serve` stage) but is a safe
 * no-op unless the required variables are set. Idempotent: upserts by natural
 * keys, so re-deploys never duplicate and (by design) re-assert the owner
 * password if BOOTSTRAP_OWNER_PASSWORD is still present.
 *
 * Required to do anything:
 *   BOOTSTRAP_TENANT_SLUG      e.g. "nicka" (url-safe, lowercase)
 *   BOOTSTRAP_OWNER_EMAIL      the first admin's login e-mail
 *   BOOTSTRAP_OWNER_PASSWORD   the first admin's password (min 8 chars)
 * Optional:
 *   BOOTSTRAP_TENANT_NAME      display name (defaults to the slug)
 *   BOOTSTRAP_OWNER_NAME       display name (defaults to the e-mail)
 *
 * Security note: once the owner exists and has logged in, remove
 * BOOTSTRAP_OWNER_PASSWORD from the host so the password is not re-applied and
 * not left sitting in the environment.
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

/** scrypt$<saltHex>$<hashHex> — mirrors apps/api/src/lib/password.ts. */
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function main() {
  const slug = process.env.BOOTSTRAP_TENANT_SLUG?.trim().toLowerCase();
  const email = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD;

  if (!slug || !email || !password) {
    console.log(
      'ℹ️  bootstrap: BOOTSTRAP_TENANT_SLUG / BOOTSTRAP_OWNER_EMAIL / ' +
        'BOOTSTRAP_OWNER_PASSWORD not all set — skipping (no-op).',
    );
    return;
  }
  if (password.length < 8) {
    console.error('❌ bootstrap: BOOTSTRAP_OWNER_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const tenantName = process.env.BOOTSTRAP_TENANT_NAME?.trim() || slug;
  const ownerName = process.env.BOOTSTRAP_OWNER_NAME?.trim() || email;

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: tenantName,
      brandName: tenantName,
      locale: 'de-CH',
      timezone: 'Europe/Zurich',
      currency: 'CHF',
    },
  });

  const owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    update: { passwordHash: hashPassword(password) },
    create: {
      tenantId: tenant.id,
      email,
      name: ownerName,
      passwordHash: hashPassword(password),
    },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: { role: 'OWNER' },
    create: { tenantId: tenant.id, userId: owner.id, role: 'OWNER' },
  });

  console.log(`✅ bootstrap: owner "${email}" ready in workspace "${slug}".`);
}

main()
  .catch((e) => {
    console.error('❌ bootstrap failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
