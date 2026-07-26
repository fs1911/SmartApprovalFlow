/**
 * Per-tenant human reference generation (e.g. AC-2026-0007).
 *
 * The number is derived from the current case count, which races under
 * concurrency (two simultaneous creates compute the same reference → the unique
 * constraint `(tenantId, reference)` rejects one). `withUniqueReference` retries
 * on that specific conflict, recomputing the reference each attempt, so creation
 * is safe under parallel load (and under parallel CI test files).
 */
import { randomInt } from 'node:crypto';
import { prisma, Prisma } from '@saf/db';

export async function computeReference(tenantId: string, offset = 0): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.approvalCase.count({ where: { tenantId } }).catch(() => 0);
  return `AC-${year}-${String(count + 1 + offset).padStart(4, '0')}`;
}

/** True for a Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * Run a create that needs a unique per-tenant reference, retrying on collision.
 *
 * The first attempt uses the clean sequential number (count + 1). On a collision
 * we add random jitter over a *widening* window so many concurrent creators (who
 * all read the same count and would otherwise retry in lockstep) spread out and
 * converge quickly instead of colliding again. Uniqueness is guaranteed by the
 * DB constraint; this just resolves the race without a 500.
 */
export async function withUniqueReference<T>(
  tenantId: string,
  create: (reference: string) => Promise<T>,
  maxAttempts = 12,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const offset = attempt === 0 ? 0 : randomInt(0, 50 * attempt);
    const reference = await computeReference(tenantId, offset);
    try {
      return await create(reference);
    } catch (err) {
      lastErr = err;
      if (isUniqueViolation(err)) continue; // collision → recompute + retry
      throw err;
    }
  }
  throw lastErr;
}
