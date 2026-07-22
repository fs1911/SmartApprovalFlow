/**
 * Automatic reminder policy (Block 8).
 *
 * `decideReminder` is a *pure* function of the case's timing fields and the
 * configured policy — no I/O, so it is exhaustively unit-testable. `runReminders`
 * is the thin orchestration layer that finds pending cases and sends where the
 * policy says so. It is triggered on demand via POST /api/v1/reminders/run (no
 * cron dependency); see docs/reminders.md for scheduler wiring.
 */
import { prisma } from '@saf/db';
import { config } from '../config.js';
import { isPending } from './status.js';
import { sendReminder } from './case-messaging.js';

export interface ReminderPolicy {
  enabled: boolean;
  firstAfterHours: number;
  repeatEveryHours: number;
  max: number;
}

export function policyFromConfig(): ReminderPolicy {
  return {
    enabled: config.REMINDER_ENABLED,
    firstAfterHours: config.REMINDER_FIRST_AFTER_HOURS,
    repeatEveryHours: config.REMINDER_REPEAT_EVERY_HOURS,
    max: config.REMINDER_MAX,
  };
}

export interface ReminderCandidate {
  status: string;
  sentAt: Date | null;
  lastReminderAt: Date | null;
  reminderCount: number;
  hasEmail: boolean;
}

export type ReminderDecision =
  | { send: true }
  | { send: false; reason: 'disabled' | 'not_pending' | 'no_email' | 'cap_reached' | 'too_soon' | 'never_sent' };

const HOUR_MS = 60 * 60 * 1000;

/**
 * Decide whether a reminder is due for one case, right now. Pure: same inputs
 * always yield the same decision.
 */
export function decideReminder(
  c: ReminderCandidate,
  policy: ReminderPolicy,
  now: Date = new Date(),
): ReminderDecision {
  if (!policy.enabled) return { send: false, reason: 'disabled' };
  if (!isPending(c.status as never)) return { send: false, reason: 'not_pending' };
  if (!c.hasEmail) return { send: false, reason: 'no_email' };
  if (c.reminderCount >= policy.max) return { send: false, reason: 'cap_reached' };
  // A case must have been sent before it can be reminded.
  if (!c.sentAt) return { send: false, reason: 'never_sent' };

  if (c.reminderCount === 0) {
    const due = c.sentAt.getTime() + policy.firstAfterHours * HOUR_MS;
    return now.getTime() >= due ? { send: true } : { send: false, reason: 'too_soon' };
  }

  // Subsequent reminders are paced from the last one (fall back to sentAt).
  const anchor = c.lastReminderAt ?? c.sentAt;
  const due = anchor.getTime() + policy.repeatEveryHours * HOUR_MS;
  return now.getTime() >= due ? { send: true } : { send: false, reason: 'too_soon' };
}

export interface RunReminderResult {
  evaluated: number;
  sent: number;
  skipped: number;
  /** Per-case outcomes, capped for a readable response. */
  details: { caseId: string; reference: string; sent: boolean; reason?: string }[];
}

/**
 * Evaluate the reminder policy for every pending case of a tenant and send the
 * ones that are due. Returns a summary. Safe to call repeatedly (idempotent by
 * timing — a case that was just reminded won't be due again immediately).
 */
export async function runReminders(tenantId: string, now: Date = new Date()): Promise<RunReminderResult> {
  const policy = policyFromConfig();
  const result: RunReminderResult = { evaluated: 0, sent: 0, skipped: 0, details: [] };

  if (!policy.enabled) return result;

  const cases = await prisma.approvalCase.findMany({
    where: { tenantId, status: { in: ['SENT', 'VIEWED', 'CALLBACK'] } },
    select: {
      id: true,
      reference: true,
      status: true,
      sentAt: true,
      lastReminderAt: true,
      reminderCount: true,
      customer: { select: { email: true } },
    },
  });

  for (const c of cases) {
    result.evaluated += 1;
    const decision = decideReminder(
      {
        status: c.status,
        sentAt: c.sentAt,
        lastReminderAt: c.lastReminderAt,
        reminderCount: c.reminderCount,
        hasEmail: !!c.customer?.email,
      },
      policy,
      now,
    );

    if (!decision.send) {
      result.skipped += 1;
      if (result.details.length < 50) {
        result.details.push({ caseId: c.id, reference: c.reference, sent: false, reason: decision.reason });
      }
      continue;
    }

    try {
      await sendReminder(tenantId, c.id, { userId: null, actorType: 'SYSTEM' });
      result.sent += 1;
      if (result.details.length < 50) {
        result.details.push({ caseId: c.id, reference: c.reference, sent: true });
      }
    } catch (err) {
      result.skipped += 1;
      if (result.details.length < 50) {
        result.details.push({
          caseId: c.id,
          reference: c.reference,
          sent: false,
          reason: `error: ${(err as Error).message}`,
        });
      }
    }
  }

  return result;
}
