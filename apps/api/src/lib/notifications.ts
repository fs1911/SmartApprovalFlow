/**
 * Notification service — a clean abstraction over message transport.
 *
 * MVP decision (see docs/block-3-summary.md): we ship a production-shaped
 * interface with a **console/dev provider** as the default. No real credentials
 * are required to run and test the full send flow; wiring a real provider
 * (SMTP, Resend, Postmark, …) later means implementing one `EmailProvider` and
 * selecting it via `EMAIL_PROVIDER` — no route changes.
 *
 * SMS is represented in the model (MessageChannel.SMS) but not transported yet;
 * `getProvider('SMS')` returns a disabled provider that records a FAILED message
 * with a clear reason, so the structure is ready without pretending to send.
 */
import { randomUUID } from 'node:crypto';
import type { MessageChannel } from '@saf/types';
import { prisma } from '@saf/db';
import { config } from '../config.js';

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

export interface MessageProvider {
  readonly name: string;
  send(msg: OutboundEmail): Promise<SendResult>;
}

/** Dev/default provider: logs the message and succeeds. */
class ConsoleProvider implements MessageProvider {
  readonly name = 'console';
  async send(msg: OutboundEmail): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.log(
      `\n📧 [console-mail] → ${msg.to}\n   Subject: ${msg.subject}\n   ${msg.body
        .split('\n')
        .join('\n   ')}\n`,
    );
    return { ok: true, providerId: `console-${randomUUID()}` };
  }
}

/** Placeholder for SMS until a real provider is connected. */
class DisabledSmsProvider implements MessageProvider {
  readonly name = 'sms-disabled';
  async send(): Promise<SendResult> {
    return { ok: false, error: 'SMS-Versand ist im MVP noch nicht aktiviert.' };
  }
}

function getProvider(channel: MessageChannel): MessageProvider {
  if (channel === 'SMS') return new DisabledSmsProvider();
  // channel === 'EMAIL'
  switch (config.EMAIL_PROVIDER) {
    // case 'smtp': return new SmtpProvider();   // Block 4/5: plug in here
    case 'console':
    default:
      return new ConsoleProvider();
  }
}

/**
 * Record and transport an outbound message. Persists an OutboundMessage row and
 * transitions it QUEUED → SENT/FAILED. Returns the final row. Network transport
 * happens outside any DB transaction to avoid holding locks.
 */
export async function dispatchMessage(opts: {
  tenantId: string;
  approvalCaseId: string;
  channel: MessageChannel;
  toAddress: string;
  templateKey: string;
  subject: string;
  body: string;
}) {
  const message = await prisma.outboundMessage.create({
    data: {
      tenantId: opts.tenantId,
      approvalCaseId: opts.approvalCaseId,
      channel: opts.channel,
      toAddress: opts.toAddress,
      templateKey: opts.templateKey,
      status: 'QUEUED',
    },
  });

  const provider = getProvider(opts.channel);
  const result = await provider.send({
    to: opts.toAddress,
    subject: opts.subject,
    body: opts.body,
  });

  return prisma.outboundMessage.update({
    where: { id: message.id },
    data: result.ok
      ? { status: 'SENT', providerId: result.providerId }
      : { status: 'FAILED', error: result.error },
  });
}
