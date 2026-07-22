/**
 * Usage counting + limit enforcement (Block 11).
 *
 * `monthPeriod` and `evaluateLimit` (from @saf/types) are pure and unit-tested.
 * `getSubscription`/`getUsage` read the DB; `assertWithinCaseLimit` and
 * `assertWithinSeatLimit` are the central guards the routes call before a
 * limited action (sending a case, inviting a member).
 */
import { prisma } from '@saf/db';
import { PLANS, evaluateLimit, type PlanKey, type LimitStatus } from '@saf/types';
import { errors } from './errors.js';

export interface Period {
  start: Date;
  end: Date;
}

/** Calendar-month period containing `now` (UTC). Pure → unit-tested. */
export function monthPeriod(now: Date = new Date()): Period {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Read (or lazily create) the tenant's subscription. */
export async function getSubscription(tenantId: string) {
  const existing = await prisma.subscription.findUnique({ where: { tenantId } });
  if (existing) return existing;
  // Backfill a default subscription for tenants created before Block 11.
  return prisma.subscription.create({ data: { tenantId } });
}

export interface UsageSummary {
  planKey: PlanKey;
  period: { start: string; end: string };
  cases: LimitStatus;
  seats: LimitStatus;
}

/** Gather current usage for the tenant and evaluate it against the plan limits. */
export async function getUsage(tenantId: string, now: Date = new Date()): Promise<UsageSummary> {
  const sub = await getSubscription(tenantId);
  const limits = PLANS[sub.planKey].limits;
  const period = monthPeriod(now);

  const [sentCases, members, pendingInvites] = await Promise.all([
    prisma.approvalCase.count({
      where: { tenantId, sentAt: { gte: period.start, lt: period.end } },
    }),
    prisma.membership.count({ where: { tenantId } }),
    prisma.verificationToken.count({
      where: { tenantId, type: 'INVITE', consumedAt: null, revokedAt: null },
    }),
  ]);

  return {
    planKey: sub.planKey,
    period: { start: period.start.toISOString(), end: period.end.toISOString() },
    cases: evaluateLimit(sentCases, limits.casesPerMonth),
    // Seats consumed = active members + outstanding invitations.
    seats: evaluateLimit(members + pendingInvites, limits.seats),
  };
}

/** Guard: throw a typed 402 when sending another case would exceed the plan. */
export async function assertWithinCaseLimit(tenantId: string): Promise<void> {
  const usage = await getUsage(tenantId);
  if (!usage.cases.withinLimit) {
    throw errors.planLimitReached(
      `Das Monatslimit von ${usage.cases.limit} gesendeten Freigaben ist erreicht. Bitte upgraden Sie Ihren Plan.`,
    );
  }
}

/** Guard: throw a typed 402 when adding another seat would exceed the plan. */
export async function assertWithinSeatLimit(tenantId: string): Promise<void> {
  const usage = await getUsage(tenantId);
  if (!usage.seats.withinLimit) {
    throw errors.planLimitReached(
      `Das Limit von ${usage.seats.limit} Sitzen ist erreicht. Bitte upgraden Sie Ihren Plan, um weitere Mitglieder einzuladen.`,
    );
  }
}
