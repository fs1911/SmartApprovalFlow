/**
 * Idempotency for unsafe writes (see docs/api-design.md).
 *
 * Block 7: persistent, Postgres-backed and keyed by (tenantId, key), so a retry
 * replays the original response even across restarts / multiple instances. A key
 * reused with a *different* payload is a conflict (caller must fix the key).
 */
import { prisma, Prisma } from '@saf/db';

const TTL_MS = 24 * 60 * 60 * 1000;

export interface StoredResponse {
  statusCode: number;
  body: unknown;
  fingerprint: string;
}

export async function getIdempotent(tenantId: string, key: string): Promise<StoredResponse | null> {
  const row = await prisma.idempotencyRecord.findUnique({
    where: { tenantId_key: { tenantId, key } },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.idempotencyRecord.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }
  return { statusCode: row.statusCode, body: row.body, fingerprint: row.fingerprint };
}

export async function saveIdempotent(
  tenantId: string,
  key: string,
  statusCode: number,
  body: unknown,
  fingerprint: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.idempotencyRecord.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: {}, // first write wins; concurrent retries keep the original
    create: {
      tenantId,
      key,
      fingerprint,
      statusCode,
      body: body as Prisma.InputJsonValue,
      expiresAt,
    },
  });
}
