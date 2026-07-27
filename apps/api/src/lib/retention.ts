/**
 * Retention / cleanup policy (Block 9).
 *
 * `retentionCutoffs` is a *pure* function of the policy + "now" (unit-tested).
 * `runCleanup` applies it for one tenant: it removes rows that are safe to drop
 * — expired idempotency records, delivered/failed webhook deliveries past their
 * retention window, and orphaned attachments (registered but never uploaded).
 *
 * Triggered on demand via POST /api/v1/maintenance/cleanup (members:manage) —
 * no cron dependency, same pattern as the reminder policy. See
 * docs/retention-and-cleanup.md.
 */
import { prisma } from '@saf/db';
import { config } from '../config.js';

export interface RetentionPolicy {
  webhookDays: number;
  orphanAttachmentHours: number;
  /** Erase terminal cases older than N months (0 = disabled). */
  caseMonths: number;
}

export function policyFromConfig(): RetentionPolicy {
  return {
    webhookDays: config.RETENTION_WEBHOOK_DAYS,
    orphanAttachmentHours: config.RETENTION_ORPHAN_ATTACHMENT_HOURS,
    caseMonths: config.RETENTION_CASE_MONTHS,
  };
}

export interface RetentionCutoffs {
  /** Terminal webhook deliveries created before this are removed. */
  webhookBefore: Date;
  /** Never-uploaded attachments created before this are removed. */
  orphanAttachmentBefore: Date;
  /** Idempotency records that expired before this are removed. */
  idempotencyExpiredBefore: Date;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function retentionCutoffs(policy: RetentionPolicy, now: Date = new Date()): RetentionCutoffs {
  return {
    webhookBefore: new Date(now.getTime() - policy.webhookDays * DAY_MS),
    orphanAttachmentBefore: new Date(now.getTime() - policy.orphanAttachmentHours * HOUR_MS),
    idempotencyExpiredBefore: now,
  };
}

/** Terminal statuses eligible for retention-based erasure. */
const TERMINAL_STATUSES = ['APPROVED', 'PARTIALLY_APPROVED', 'DECLINED', 'EXPIRED', 'CANCELLED'];
const MONTH_MS = 30 * DAY_MS;

export interface CleanupResult {
  idempotencyRemoved: number;
  webhookDeliveriesRemoved: number;
  orphanAttachmentsRemoved: number;
  casesErased: number;
}

/**
 * Delete stale rows for one tenant. All deletes are tenant-scoped and only touch
 * rows that are provably safe to drop; nothing that could still be needed for the
 * audit trail or an in-flight flow is removed. Case retention only runs when
 * RETENTION_CASE_MONTHS > 0 (opt-in) and only erases terminal cases.
 */
export async function runCleanup(tenantId: string, now: Date = new Date()): Promise<CleanupResult> {
  const policy = policyFromConfig();
  const cut = retentionCutoffs(policy, now);

  const [idem, webhooks, orphans] = await prisma.$transaction([
    prisma.idempotencyRecord.deleteMany({
      where: { tenantId, expiresAt: { lt: cut.idempotencyExpiredBefore } },
    }),
    prisma.webhookDelivery.deleteMany({
      where: {
        tenantId,
        status: { in: ['SENT', 'DELIVERED', 'FAILED'] },
        createdAt: { lt: cut.webhookBefore },
      },
    }),
    prisma.attachment.deleteMany({
      where: {
        tenantId,
        uploadedAt: null,
        createdAt: { lt: cut.orphanAttachmentBefore },
      },
    }),
  ]);

  // Opt-in case retention: erase terminal cases last updated before the cutoff.
  let casesErased = 0;
  if (policy.caseMonths > 0) {
    const before = new Date(now.getTime() - policy.caseMonths * MONTH_MS);
    const del = await prisma.approvalCase.deleteMany({
      where: { tenantId, status: { in: TERMINAL_STATUSES as never[] }, updatedAt: { lt: before } },
    });
    casesErased = del.count;
  }

  return {
    idempotencyRemoved: idem.count,
    webhookDeliveriesRemoved: webhooks.count,
    orphanAttachmentsRemoved: orphans.count,
    casesErased,
  };
}
