'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiClientError } from '@/lib/api';

export interface LinkState {
  url?: string;
  expiresAt?: string;
  error?: string;
}

export async function generatePublicLink(id: string): Promise<LinkState> {
  try {
    const res = await api.request<{ url: string; expiresAt: string }>(
      `/api/v1/approval-cases/${id}/generate-public-link`,
      { method: 'POST' },
    );
    revalidatePath(`/approvals/${id}`);
    return { url: res.url, expiresAt: res.expiresAt };
  } catch (e) {
    return { error: e instanceof ApiClientError ? e.message : 'Link konnte nicht erzeugt werden.' };
  }
}

export interface ActionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

export async function sendCase(id: string): Promise<ActionResult> {
  try {
    const res = await api.request<{ messageStatus: string }>(
      `/api/v1/approval-cases/${id}/send`,
      { method: 'POST' },
    );
    revalidatePath(`/approvals/${id}`);
    return {
      ok: true,
      message:
        res.messageStatus === 'SENT'
          ? 'Anfrage per E-Mail an den Kunden gesendet.'
          : 'Anfrage verarbeitet, E-Mail-Versand meldete einen Fehler.',
    };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Senden fehlgeschlagen.' };
  }
}

export async function remindCase(id: string): Promise<ActionResult> {
  try {
    await api.request(`/api/v1/approval-cases/${id}/remind`, { method: 'POST' });
    revalidatePath(`/approvals/${id}`);
    return { ok: true, message: 'Erinnerung an den Kunden gesendet.' };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Erinnerung fehlgeschlagen.',
    };
  }
}
