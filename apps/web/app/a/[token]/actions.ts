'use server';

import { randomUUID } from 'node:crypto';
import { api, ApiClientError } from '@/lib/api';

export interface RespondResult {
  ok: boolean;
  status?: string;
  error?: string;
}

export async function respond(
  token: string,
  decision: 'APPROVE' | 'DECLINE' | 'CALLBACK',
  note?: string,
  callbackPhone?: string,
): Promise<RespondResult> {
  try {
    const res = await api.request<{ status: string }>(
      `/api/v1/public/approvals/${token}/respond`,
      {
        method: 'POST',
        publicRoute: true,
        idempotencyKey: randomUUID(),
        body: { decision, note: note || undefined, callbackPhone: callbackPhone || undefined },
      },
    );
    return { ok: true, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Ihre Antwort konnte nicht gespeichert werden.',
    };
  }
}

/** Submit per-position decisions; the case status is aggregated server-side. */
export async function respondItems(
  token: string,
  items: { itemId: string; decision: 'APPROVE' | 'DECLINE' | 'CALLBACK' }[],
  note?: string,
): Promise<RespondResult> {
  try {
    const res = await api.request<{ status: string }>(
      `/api/v1/public/approvals/${token}/respond-items`,
      {
        method: 'POST',
        publicRoute: true,
        idempotencyKey: randomUUID(),
        body: { items, note: note || undefined },
      },
    );
    return { ok: true, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Ihre Antwort konnte nicht gespeichert werden.',
    };
  }
}
