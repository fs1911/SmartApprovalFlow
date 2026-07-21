/**
 * Approval case state machine.
 *
 * Central definition of which status transitions are allowed. Routes call
 * `assertTransition` before changing status so we never end up in an unclear
 * intermediate state. See docs/domain-model.md for the diagram.
 */
import type { ApprovalCaseStatus } from '@saf/types';
import { TERMINAL_CASE_STATUS } from '@saf/types';
import { errors } from './errors.js';

/** Allowed target statuses for each source status. */
const TRANSITIONS: Record<ApprovalCaseStatus, ApprovalCaseStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['VIEWED', 'APPROVED', 'DECLINED', 'CALLBACK', 'EXPIRED', 'CANCELLED'],
  VIEWED: ['APPROVED', 'DECLINED', 'CALLBACK', 'EXPIRED', 'CANCELLED'],
  // CALLBACK is intentionally non-terminal: the customer can still decide.
  CALLBACK: ['APPROVED', 'DECLINED', 'EXPIRED', 'CANCELLED'],
  APPROVED: [],
  DECLINED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export function canTransition(from: ApprovalCaseStatus, to: ApprovalCaseStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ApprovalCaseStatus, to: ApprovalCaseStatus): void {
  if (!canTransition(from, to)) {
    throw errors.caseNotActionable(
      `Ungültiger Statuswechsel: ${from} → ${to} ist nicht erlaubt.`,
    );
  }
}

export function isTerminal(status: ApprovalCaseStatus): boolean {
  return TERMINAL_CASE_STATUS.includes(status);
}

/** A case is "pending" (a customer response is still expected). */
export function isPending(status: ApprovalCaseStatus): boolean {
  return status === 'SENT' || status === 'VIEWED' || status === 'CALLBACK';
}

/** True when an expiry timestamp has passed and the case is still open. */
export function isExpired(
  status: ApprovalCaseStatus,
  expiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (isTerminal(status)) return false;
  return !!expiresAt && expiresAt.getTime() < now.getTime();
}
