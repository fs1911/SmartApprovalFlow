/**
 * Outbound webhook delivery (Block 7).
 *
 * Domain events are queued as WebhookDelivery rows by lib/events.ts. This worker
 * turns QUEUED (and due-for-retry) rows into signed HTTP POSTs with retry/backoff.
 * Signature: `X-SAF-Signature: sha256=<hex>` = HMAC-SHA256(secret, rawBody).
 *
 * There is no cron dependency: delivery is driven on demand (POST
 * /api/v1/webhooks/deliver) and is fully testable locally against the dev sink.
 * A real scheduler can call the same `deliverPending()` on an interval later.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@saf/db';
import { config } from '../config.js';

export function signPayload(secret: string, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

/** Verify a signature header (exposed for the dev sink + tests). */
export function verifySignature(secret: string, rawBody: string, signature: string): boolean {
  const expected = signPayload(secret, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Exponential backoff (seconds) capped, indexed by attempt number. */
export function backoffSeconds(attempt: number): number {
  return Math.min(10 * 2 ** (attempt - 1), 30 * 60); // 10s,20s,40s… cap 30m
}

interface DeliveryWithEndpoint {
  id: string;
  attempts: number;
  eventType: string;
  payload: unknown;
  endpoint: { url: string; secret: string; isActive: boolean };
}

async function deliverOne(d: DeliveryWithEndpoint): Promise<'SENT' | 'RETRY' | 'FAILED'> {
  const attempt = d.attempts + 1;
  const rawBody = JSON.stringify(d.payload);
  let okResponse = false;
  let errorText: string | null = null;

  if (!d.endpoint.isActive) {
    errorText = 'endpoint inactive';
  } else {
    try {
      const res = await fetch(d.endpoint.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-saf-event': d.eventType,
          'x-saf-delivery': d.id,
          'x-saf-signature': signPayload(d.endpoint.secret, rawBody),
        },
        body: rawBody,
        signal: AbortSignal.timeout(10_000),
      });
      okResponse = res.ok;
      if (!res.ok) errorText = `HTTP ${res.status}`;
    } catch (err) {
      errorText = (err as Error).message;
    }
  }

  if (okResponse) {
    await prisma.webhookDelivery.update({
      where: { id: d.id },
      data: { status: 'SENT', attempts: attempt, lastError: null, nextAttemptAt: null },
    });
    return 'SENT';
  }

  const exhausted = attempt >= config.WEBHOOK_MAX_ATTEMPTS;
  await prisma.webhookDelivery.update({
    where: { id: d.id },
    data: {
      status: exhausted ? 'FAILED' : 'QUEUED',
      attempts: attempt,
      lastError: errorText,
      nextAttemptAt: exhausted ? null : new Date(Date.now() + backoffSeconds(attempt) * 1000),
    },
  });
  return exhausted ? 'FAILED' : 'RETRY';
}

/** Process due deliveries. Returns a summary. Safe to call repeatedly. */
export async function deliverPending(limit = 50): Promise<{ processed: number; sent: number; retry: number; failed: number }> {
  const now = new Date();
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: 'QUEUED',
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: { endpoint: { select: { url: true, secret: true, isActive: true } } },
  });

  let sent = 0;
  let retry = 0;
  let failed = 0;
  for (const d of due) {
    const result = await deliverOne(d as DeliveryWithEndpoint);
    if (result === 'SENT') sent++;
    else if (result === 'RETRY') retry++;
    else failed++;
  }
  return { processed: due.length, sent, retry, failed };
}
