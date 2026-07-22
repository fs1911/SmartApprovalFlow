/**
 * Shared case-messaging helpers.
 *
 * Extracted in Block 8 so the manual "send/remind" routes and the automatic
 * reminder-policy runner (lib/reminders.ts) render, address and deliver messages
 * through the exact same code path — no drift between manual and automatic sends.
 */
import { prisma } from '@saf/db';
import { config } from '../config.js';
import { errors } from './errors.js';
import { issueAccessToken, defaultLinkExpiry } from './access-link.js';
import { dispatchMessage } from './notifications.js';
import { renderTemplate } from './templates.js';
import { buildCaseContext } from './case-context.js';
import { publishEvent } from './events.js';

/** Load a case with everything needed to render + address a message. */
export async function loadCaseForMessaging(tenantId: string, id: string) {
  const c = await prisma.approvalCase.findFirst({
    where: { id, tenantId },
    include: {
      items: true,
      customer: true,
      vehicle: true,
      tenant: { select: { name: true, brandName: true, currency: true } },
    },
  });
  if (!c) throw errors.notFound('Approval-Fall nicht gefunden');
  return c;
}

/** Issue a fresh access link for a case and return its public URL. */
export async function issueLink(tenantId: string, caseId: string) {
  const { token, tokenHash } = issueAccessToken();
  const expiresAt = defaultLinkExpiry();
  await prisma.approvalAccessLink.upsert({
    where: { approvalCaseId: caseId },
    update: { tokenHash, expiresAt, revokedAt: null, firstViewedAt: null },
    create: { tenantId, approvalCaseId: caseId, tokenHash, expiresAt },
  });
  return { token, expiresAt, url: `${config.WEB_BASE_URL}/a/${token}` };
}

/** Fallback templates used when a tenant hasn't customised one. */
export const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  approval_request_email: {
    subject: 'Freigabe angefragt: {{subject}}',
    body: 'Guten Tag {{customerName}}\n\n{{subject}} ({{priceBand}}).\nBitte hier freigeben: {{link}}\n\n{{workspaceName}}',
  },
  approval_reminder_email: {
    subject: 'Erinnerung: {{subject}}',
    body: 'Guten Tag {{customerName}}\n\nErinnerung zu {{subject}} ({{priceBand}}).\n{{link}}\n\n{{workspaceName}}',
  },
};

/** Look up a tenant template (or fall back) and render it for a case. */
export async function renderCaseTemplate(
  tenantId: string,
  key: string,
  c: Awaited<ReturnType<typeof loadCaseForMessaging>>,
  linkUrl: string,
) {
  const tpl =
    (await prisma.messageTemplate.findUnique({
      where: { tenantId_key: { tenantId, key } },
      select: { subject: true, body: true },
    })) ??
    DEFAULT_TEMPLATES[key] ??
    DEFAULT_TEMPLATES.approval_request_email!;

  const ctx = buildCaseContext(c, linkUrl);
  return {
    subject: renderTemplate(tpl.subject ?? '', ctx),
    body: renderTemplate(tpl.body, ctx),
  };
}

export interface MessageActor {
  userId: string | null;
  actorType: 'USER' | 'SYSTEM';
}

/**
 * Deliver a reminder for a single, already-validated case: rotate the link,
 * render the reminder template, dispatch it, bump the reminder counter and
 * record audit + domain event. Callers must ensure the case is pending and the
 * customer has an e-mail. Returns the delivery outcome for the response.
 */
export async function sendReminder(tenantId: string, caseId: string, actor: MessageActor) {
  const c = await loadCaseForMessaging(tenantId, caseId);
  const toAddress = c.customer?.email;
  if (!toAddress) {
    throw errors.validation('Für den E-Mail-Versand fehlt die Kundenadresse.', [
      { path: 'customer.email', message: 'E-Mail-Adresse erforderlich' },
    ]);
  }

  const link = await issueLink(tenantId, caseId);
  const rendered = await renderCaseTemplate(tenantId, 'approval_reminder_email', c, link.url);

  const message = await dispatchMessage({
    tenantId,
    approvalCaseId: caseId,
    channel: 'EMAIL',
    toAddress,
    templateKey: 'approval_reminder_email',
    subject: rendered.subject,
    body: rendered.body,
  });

  await prisma.$transaction([
    prisma.approvalCase.update({
      where: { id: caseId },
      data: { lastReminderAt: new Date(), reminderCount: { increment: 1 } },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId,
        approvalCaseId: caseId,
        type: 'CASE_REMINDER_SENT',
        actorType: actor.actorType,
        actorUserId: actor.userId,
        actorLabel: actor.actorType === 'SYSTEM' ? 'system (auto-reminder)' : null,
        metadata: { channel: 'EMAIL', to: toAddress, messageStatus: message.status },
      },
    }),
  ]);

  await publishEvent({
    type: 'approval_case.reminder_sent',
    tenantId,
    approvalCaseId: caseId,
    data: { reference: c.reference, reminderCount: c.reminderCount + 1, auto: actor.actorType === 'SYSTEM' },
  });

  return {
    status: c.status,
    messageStatus: message.status,
    link: link.url,
    reminderCount: c.reminderCount + 1,
  };
}
