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

/**
 * Real e-mail via Resend (https://resend.com). Thin adapter over the HTTP API —
 * no SDK dependency. Only constructed when a RESEND_API_KEY is configured, so a
 * dev checkout without the key never reaches this path.
 */
class ResendProvider implements MessageProvider {
  readonly name = 'resend';
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(msg: OutboundEmail): Promise<SendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [msg.to],
          subject: msg.subject,
          // Plain-text body; HTML templating is a later concern.
          text: msg.body,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 200)}` };
      }
      const json = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, providerId: json.id ?? 'resend' };
    } catch (err) {
      return { ok: false, error: `Resend request failed: ${(err as Error).message}` };
    }
  }
}

/** Placeholder for SMS until a real provider is connected. */
class DisabledSmsProvider implements MessageProvider {
  readonly name = 'sms-disabled';
  async send(): Promise<SendResult> {
    return { ok: false, error: 'SMS-Versand ist im MVP noch nicht aktiviert.' };
  }
}

/**
 * Decide which e-mail provider is *effectively* active, given configuration.
 * Pure function so the fallback rules are unit-testable. Choosing `resend`
 * without a key degrades to `console` (with a warning) rather than failing.
 */
export function resolveEmailProviderName(cfg = {
  provider: config.EMAIL_PROVIDER,
  hasResendKey: !!config.RESEND_API_KEY,
}): 'console' | 'resend' {
  if (cfg.provider === 'resend') {
    if (cfg.hasResendKey) return 'resend';
    // eslint-disable-next-line no-console
    console.warn('⚠️  EMAIL_PROVIDER=resend but RESEND_API_KEY is missing — using console provider.');
    return 'console';
  }
  // `smtp` is reserved but not implemented yet → console.
  return 'console';
}

function getProvider(channel: MessageChannel): MessageProvider {
  if (channel === 'SMS') return new DisabledSmsProvider();
  // channel === 'EMAIL'
  if (resolveEmailProviderName() === 'resend') {
    return new ResendProvider(config.RESEND_API_KEY!, config.EMAIL_FROM);
  }
  return new ConsoleProvider();
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
