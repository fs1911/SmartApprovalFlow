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

export interface RegisterAttachmentResult {
  ok: boolean;
  /** Browser-reachable URL to PUT the raw bytes to (local dev signed URL). */
  uploadUrl?: string;
  method?: string;
  attachmentId?: string;
  error?: string;
}

/**
 * Step 1 of the two-step upload: register the attachment server-side (authed)
 * and hand the browser a signed upload target. The client then PUTs the bytes
 * directly to `uploadUrl` and calls `finishAttachment` to refresh the view.
 */
export async function registerAttachment(
  id: string,
  input: { fileName: string; contentType: string; sizeBytes: number; approvalItemId?: string },
): Promise<RegisterAttachmentResult> {
  try {
    const res = await api.request<{
      attachment: { id: string };
      upload: { url: string; method: string };
    }>(`/api/v1/approval-cases/${id}/attachments`, { method: 'POST', body: input });
    return {
      ok: true,
      uploadUrl: res.upload.url,
      method: res.upload.method,
      attachmentId: res.attachment.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Foto konnte nicht vorbereitet werden.',
    };
  }
}

export async function finishAttachment(id: string): Promise<void> {
  revalidatePath(`/approvals/${id}`);
}

export async function deleteAttachment(id: string, attachmentId: string): Promise<ActionResult> {
  try {
    await api.request(`/api/v1/approval-cases/${id}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    revalidatePath(`/approvals/${id}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Foto konnte nicht gelöscht werden.',
    };
  }
}
