/**
 * Canonical enums and status models for Smart Approval Flow.
 *
 * These are the single source of truth shared by the API, the web app and the
 * database layer. Keep them in sync with packages/db/prisma/schema.prisma.
 */

/**
 * Roles a user can hold within a single workspace (tenant). Controlled set —
 * no free-form custom roles. Note: `SERVICE_ADVISOR` is the product's "Advisor"
 * (kept as the enum value for backwards compatibility with existing data).
 */
export const ROLES = ['OWNER', 'ADMIN', 'SERVICE_ADVISOR', 'TECHNICIAN', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

/** Human-facing labels (German UI). */
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Inhaber:in',
  ADMIN: 'Administrator:in',
  SERVICE_ADVISOR: 'Serviceberater:in',
  TECHNICIAN: 'Techniker:in',
  VIEWER: 'Betrachter:in',
};

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
  // Per-item approval (Block 8): some positions approved, others declined.
  'PARTIALLY_APPROVED',
  'DECLINED',
  'CALLBACK',
  'EXPIRED',
  'CANCELLED',
] as const;
export type ApprovalCaseStatus = (typeof APPROVAL_CASE_STATUS)[number];

/** Terminal states — no further customer action is expected. */
export const TERMINAL_CASE_STATUS: ApprovalCaseStatus[] = [
  'APPROVED',
  'PARTIALLY_APPROVED',
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
  'CASE_REMINDER_SENT',
  'CASE_LINK_VIEWED',
  'CASE_APPROVED',
  'CASE_PARTIALLY_APPROVED',
  'CASE_DECLINED',
  'CASE_CALLBACK_REQUESTED',
  'CASE_EXPIRED',
  'CASE_CANCELLED',
  'CASE_ITEM_DECIDED',
  'CASE_ATTACHMENT_ADDED',
  'MEMBER_INVITED',
  'MEMBER_JOINED',
  'MEMBER_INVITE_REVOKED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'MESSAGE_QUEUED',
  'MESSAGE_SENT',
  'MESSAGE_FAILED',
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPE)[number];

/**
 * Domain events for integration readiness (webhooks, Block 5 delivery).
 * Stable, dot-namespaced names that external systems can subscribe to.
 * These are the *contract*; the audit trail is the internal record.
 */
export const DOMAIN_EVENT_TYPE = [
  'approval_case.created',
  'approval_case.sent',
  'approval_case.reminder_sent',
  'approval_case.viewed',
  'approval_case.responded',
  'approval_case.approved',
  'approval_case.partially_approved',
  'approval_case.declined',
  'approval_case.callback_requested',
  'approval_case.expired',
] as const;
export type DomainEventType = (typeof DOMAIN_EVENT_TYPE)[number];

/** Who or what triggered an audit event. */
export const ACTOR_TYPE = ['USER', 'CUSTOMER', 'SYSTEM', 'API_KEY'] as const;
export type ActorType = (typeof ACTOR_TYPE)[number];
