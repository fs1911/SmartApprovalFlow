'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiClientError } from '@/lib/api';

export interface TemplateSaveState {
  ok?: boolean;
  error?: string;
}

export interface WorkspaceSaveState {
  ok?: boolean;
  error?: string;
}

export async function saveWorkspace(
  _prev: WorkspaceSaveState,
  formData: FormData,
): Promise<WorkspaceSaveState> {
  const body = {
    name: String(formData.get('name') ?? '').trim() || undefined,
    brandName: String(formData.get('brandName') ?? '').trim() || null,
    brandColor: String(formData.get('brandColor') ?? '').trim() || null,
    contactEmail: String(formData.get('contactEmail') ?? '').trim() || null,
    contactPhone: String(formData.get('contactPhone') ?? '').trim() || null,
  };
  try {
    await api.request('/api/v1/workspace', { method: 'PATCH', body });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Speichern fehlgeschlagen.' };
  }
}

export interface ChangePlanResult {
  ok: boolean;
  error?: string;
  checkoutUrl?: string;
}

export async function changePlan(planKey: string): Promise<ChangePlanResult> {
  try {
    const res = await api.request<{ applied: boolean; checkoutUrl?: string }>(
      '/api/v1/billing/change-plan',
      { method: 'POST', body: { planKey } },
    );
    revalidatePath('/settings');
    return { ok: true, checkoutUrl: res.checkoutUrl };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Planwechsel fehlgeschlagen.' };
  }
}

// --- Developer: API keys (Block 12) ----------------------------------------

export interface ApiKeyCreateResult {
  ok: boolean;
  error?: string;
  key?: string;
  prefix?: string;
}

export async function createApiKey(name: string, scopes: string[]): Promise<ApiKeyCreateResult> {
  if (!name.trim()) return { ok: false, error: 'Bitte einen Namen angeben.' };
  try {
    const res = await api.request<{ key: string; keyPrefix: string }>('/api/v1/api-keys', {
      method: 'POST',
      body: { name: name.trim(), scopes: scopes.join(' ') },
    });
    revalidatePath('/settings');
    return { ok: true, key: res.key, prefix: res.keyPrefix };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'API-Key konnte nicht erstellt werden.' };
  }
}

export async function revokeApiKey(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.request(`/api/v1/api-keys/${id}`, { method: 'DELETE' });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Widerruf fehlgeschlagen.' };
  }
}

// --- Developer: webhook endpoints (Block 12) --------------------------------

export interface WebhookCreateResult {
  ok: boolean;
  error?: string;
  secret?: string;
}

export async function createWebhook(url: string, events: string[]): Promise<WebhookCreateResult> {
  if (!url.trim()) return { ok: false, error: 'Bitte eine URL angeben.' };
  try {
    const res = await api.request<{ secret: string }>('/api/v1/webhook-endpoints', {
      method: 'POST',
      body: { url: url.trim(), events: events.length ? events : undefined },
    });
    revalidatePath('/settings');
    return { ok: true, secret: res.secret };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Endpoint konnte nicht erstellt werden.' };
  }
}

export async function rotateWebhookSecret(id: string): Promise<WebhookCreateResult> {
  try {
    const res = await api.request<{ secret: string }>(`/api/v1/webhook-endpoints/${id}/rotate-secret`, {
      method: 'POST',
    });
    revalidatePath('/settings');
    return { ok: true, secret: res.secret };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Rotation fehlgeschlagen.' };
  }
}

export async function toggleWebhook(id: string, isActive: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.request(`/api/v1/webhook-endpoints/${id}`, { method: 'PATCH', body: { isActive } });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Aktualisierung fehlgeschlagen.' };
  }
}

export async function deleteWebhook(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.request(`/api/v1/webhook-endpoints/${id}`, { method: 'DELETE' });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Löschen fehlgeschlagen.' };
  }
}

export interface WebhookTestResult {
  ok: boolean;
  error?: string;
  status?: string;
  attempts?: number;
  lastError?: string | null;
}

export async function testWebhook(id: string): Promise<WebhookTestResult> {
  try {
    const res = await api.request<{ delivery: { status: string; attempts: number; lastError: string | null } }>(
      `/api/v1/webhook-endpoints/${id}/test`,
      { method: 'POST' },
    );
    return { ok: true, status: res.delivery?.status, attempts: res.delivery?.attempts, lastError: res.delivery?.lastError };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Testzustellung fehlgeschlagen.' };
  }
}

export async function saveTemplate(
  _prev: TemplateSaveState,
  formData: FormData,
): Promise<TemplateSaveState> {
  const id = String(formData.get('id') ?? '');
  const subject = String(formData.get('subject') ?? '');
  const body = String(formData.get('body') ?? '');

  if (!body.trim()) return { ok: false, error: 'Der Nachrichtentext darf nicht leer sein.' };

  try {
    await api.request(`/api/v1/templates/${id}`, {
      method: 'PATCH',
      body: { subject, body },
    });
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Speichern fehlgeschlagen.' };
  }
}
