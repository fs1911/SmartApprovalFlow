'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiClientError } from '@/lib/api';

export interface TemplateSaveState {
  ok?: boolean;
  error?: string;
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
