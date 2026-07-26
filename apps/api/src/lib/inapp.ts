/**
 * In-app notifications (Block 14).
 *
 * `uniqueRecipients` is pure (unit-tested): it dedups a set of candidate user
 * ids and drops nulls + an optional excluded actor. `notifyForCase` /
 * `notifyAssignment` write Notification rows and are non-fatal (a notification
 * failure must never break the underlying action — same posture as the webhook
 * publisher).
 */
import { prisma, Prisma } from '@saf/db';
import type { NotificationType } from '@saf/types';

/** Dedup non-null recipients, dropping an optional excluded user (the actor). */
export function uniqueRecipients(
  candidates: (string | null | undefined)[],
  exclude?: string | null,
): string[] {
  const set = new Set<string>();
  for (const c of candidates) {
    if (c && c !== exclude) set.add(c);
  }
  return [...set];
}

async function insert(
  tenantId: string,
  userIds: string[],
  type: NotificationType,
  approvalCaseId: string | null,
  data: Record<string, unknown>,
): Promise<number> {
  if (userIds.length === 0) return 0;
  try {
    const res = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        tenantId,
        userId,
        type,
        approvalCaseId,
        data: data as Prisma.InputJsonValue,
      })),
    });
    return res.count;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('notification insert failed (non-fatal):', err);
    return 0;
  }
}

/**
 * Notify the people who care about a case (creator + assignee), minus the actor.
 * Loads the case's creator/assignee itself so callers stay simple.
 */
export async function notifyForCase(
  tenantId: string,
  caseId: string,
  type: NotificationType,
  opts: { excludeUserId?: string | null } = {},
): Promise<number> {
  try {
    const c = await prisma.approvalCase.findFirst({
      where: { id: caseId, tenantId },
      select: { reference: true, subject: true, createdById: true, assigneeUserId: true },
    });
    if (!c) return 0;
    const recipients = uniqueRecipients([c.createdById, c.assigneeUserId], opts.excludeUserId);
    return insert(tenantId, recipients, type, caseId, { reference: c.reference, subject: c.subject });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('notifyForCase failed (non-fatal):', err);
    return 0;
  }
}

/** Notify a newly assigned user (unless they assigned themselves). */
export async function notifyAssignment(
  tenantId: string,
  caseId: string,
  assigneeUserId: string,
  opts: { excludeUserId?: string | null; reference?: string; subject?: string } = {},
): Promise<number> {
  const recipients = uniqueRecipients([assigneeUserId], opts.excludeUserId);
  return insert(tenantId, recipients, 'CASE_ASSIGNED', caseId, {
    reference: opts.reference,
    subject: opts.subject,
  });
}
