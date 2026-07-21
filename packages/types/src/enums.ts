/**
 * Canonical enums and status models for Smart Approval Flow.
 *
 * These are the single source of truth shared by the API, the web app and the
 * database layer. Keep them in sync with packages/db/prisma/schema.prisma.
 */

/** Roles a user can hold within a single workspace (tenant). */
export const ROLES = ['OWNER', 'ADMIN', 'SERVICE_ADVISOR', 'TECHNICIAN'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Lifecycle of an ApprovalCase.
 *
 *  DRAFT     -> being edited, not yet sent, no customer link active
 *  SENT      -> a secure link was issued; awaiting customer action
 *  VIEWED    -> customer opened the link at least once (soft signal)
 *  APPROVED  -> customer approved the recommended work
 *  DECLINED  -> customer declined
 *  CALLBACK  -> customer requested a callback (no yes/no decision yet)
 *  EXPIRED   -> the link/decision window elapsed without a final decision
 *  CANCELLED -> the garage withdrew the case
 */
export const APPROVAL_CASE_STATUS = [
  'DRAFT',
  'SENT',
  'VIEWED',
  'APPROVED',
  'DECLINED',
  'CALLBACK',
  'EXPIRED',
  'CANCELLED',
] as const;
export type ApprovalCaseStatus = (typeof APPROVAL_CASE_STATUS)[number];

/** Terminal states — no further customer action is expected. */
export const TERMINAL_CASE_STATUS: ApprovalCaseStatus[] = [
  'APPROVED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
];

/** Urgency drives customer-facing tone and (later) reminder cadence. */
export const URGENCY = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Urgency = (typeof URGENCY)[number];

/** The three actions a customer can take on the public approval page. */
export const CUSTOMER_DECISION = ['APPROVE', 'DECLINE', 'CALLBACK'] as const;
export type CustomerDecision = (typeof CUSTOMER_DECISION)[number];

/** Recommendation classification for a single line item. */
export const ITEM_CATEGORY = ['SAFETY', 'MAINTENANCE', 'REPAIR', 'DIAGNOSTIC', 'OTHER'] as const;
export type ItemCategory = (typeof ITEM_CATEGORY)[number];

/** Delivery channel of an outbound message to the customer. */
export const MESSAGE_CHANNEL = ['EMAIL', 'SMS'] as const;
export type MessageChannel = (typeof MESSAGE_CHANNEL)[number];

/** Delivery status of an outbound message. */
export const MESSAGE_STATUS = ['QUEUED', 'SENT', 'DELIVERED', 'FAILED'] as const;
export type MessageStatus = (typeof MESSAGE_STATUS)[number];

/**
 * Audit event types. The audit trail is append-only and is the revision-proof
 * record of who did what and when — including loginless customer actions.
 */
export const AUDIT_EVENT_TYPE = [
  'CASE_CREATED',
  'CASE_UPDATED',
  'CASE_SENT',
  'CASE_LINK_VIEWED',
  'CASE_APPROVED',
  'CASE_DECLINED',
  'CASE_CALLBACK_REQUESTED',
  'CASE_EXPIRED',
  'CASE_CANCELLED',
  'MESSAGE_QUEUED',
  'MESSAGE_SENT',
  'MESSAGE_FAILED',
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPE)[number];

/** Who or what triggered an audit event. */
export const ACTOR_TYPE = ['USER', 'CUSTOMER', 'SYSTEM', 'API_KEY'] as const;
export type ActorType = (typeof ACTOR_TYPE)[number];
