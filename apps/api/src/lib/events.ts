/**
 * Domain event publisher — the integration-readiness seam.
 *
 * Routes emit domain events (stable, dot-namespaced names from
 * `DOMAIN_EVENT_TYPE`) after a successful state change. In Block 3 the publisher
 * fans events out to the tenant's registered, active `WebhookEndpoint`s by
 * recording a `WebhookDelivery` row (status QUEUED) and logging in dev. Real
 * HTTP delivery — signing, retries, backoff — is Block 5 and only touches the
 * delivery worker, not the call sites.
 *
 * Kept intentionally small: no queue, no cron. The contract is what matters now.
 */
import type { DomainEventType } from '@saf/types';
import { prisma, Prisma } from '@saf/db';
import { config } from '../config.js';
import { matchesEventAllowlist } from './webhooks.js';

export interface DomainEvent {
  type: DomainEventType;
  tenantId: string;
  approvalCaseId?: string;
  /** Customer-safe-ish payload for subscribers. Keep it stable. */
  data: Record<string, unknown>;
}

export async function publishEvent(event: DomainEvent): Promise<void> {
  // Never let webhook plumbing break the main request.
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { tenantId: event.tenantId, isActive: true },
      select: { id: true, events: true, url: true },
    });

    const targets = endpoints.filter((e) => matchesEventAllowlist(e.events, event.type));
    if (targets.length === 0) {
      if (config.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(`🔔 [event] ${event.type} (no active subscribers)`);
      }
      return;
    }

    await prisma.webhookDelivery.createMany({
      data: targets.map((e) => ({
        tenantId: event.tenantId,
        endpointId: e.id,
        eventType: event.type,
        payload: {
          type: event.type,
          approvalCaseId: event.approvalCaseId ?? null,
          data: event.data,
          occurredAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        status: 'QUEUED',
      })),
    });

    if (config.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`🔔 [event] ${event.type} queued for ${targets.length} endpoint(s)`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('event publish failed (non-fatal):', err);
  }
}
