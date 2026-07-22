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
