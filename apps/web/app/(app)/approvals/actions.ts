'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiClientError } from '@/lib/api';

export interface SavedViewResult {
  ok: boolean;
  error?: string;
}

/** Allowed filter keys a saved view may store (mirrors savedViewFiltersSchema). */
const FILTER_KEYS = [
  'status',
  'category',
  'urgency',
  'createdWithin',
  'createdFrom',
  'createdTo',
  'assignee',
] as const;

/**
 * Create a saved view from the currently active filters. The name comes from the
 * form; the filters are carried as hidden inputs so we persist exactly what the
 * user sees. Server-side Zod validation owns the final say on allowed values.
 */
export async function createSavedView(formData: FormData): Promise<SavedViewResult> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { ok: false, error: 'Bitte einen Namen für die Ansicht angeben.' };

  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = formData.get(key);
    if (typeof value === 'string' && value) filters[key] = value;
  }
  // Checkbox "Nur für mich" → PRIVATE, otherwise the workspace-wide default.
  const visibility = formData.get('private') ? 'PRIVATE' : 'SHARED';

  try {
    await api.request('/api/v1/saved-views', {
      method: 'POST',
      body: { name, filters, visibility },
    });
    revalidatePath('/approvals');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Ansicht konnte nicht gespeichert werden.',
    };
  }
}

export async function setDefaultView(id: string): Promise<SavedViewResult> {
  try {
    await api.request('/api/v1/saved-views/default', {
      method: 'POST',
      body: { savedViewId: id },
    });
    revalidatePath('/approvals');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Standard konnte nicht gesetzt werden.',
    };
  }
}

export async function clearDefaultView(): Promise<SavedViewResult> {
  try {
    await api.request('/api/v1/saved-views/default', { method: 'DELETE' });
    revalidatePath('/approvals');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Standard konnte nicht entfernt werden.',
    };
  }
}

export async function deleteSavedView(id: string): Promise<SavedViewResult> {
  try {
    await api.request(`/api/v1/saved-views/${id}`, { method: 'DELETE' });
    revalidatePath('/approvals');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Ansicht konnte nicht gelöscht werden.',
    };
  }
}

/** Rename a saved view (Block 32). The API owns the 1..80 length + unique name. */
export async function renameSavedView(id: string, name: string): Promise<SavedViewResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Bitte einen Namen für die Ansicht angeben.' };
  try {
    await api.request(`/api/v1/saved-views/${id}`, {
      method: 'PATCH',
      body: { name: trimmed },
    });
    revalidatePath('/approvals');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Ansicht konnte nicht umbenannt werden.',
    };
  }
}

/** Persist the manual display order of saved views (Block 32). */
export async function reorderSavedViews(orderedIds: string[]): Promise<SavedViewResult> {
  try {
    await api.request('/api/v1/saved-views/reorder', {
      method: 'POST',
      body: { orderedIds },
    });
    revalidatePath('/approvals');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof ApiClientError ? e.message : 'Reihenfolge konnte nicht gespeichert werden.',
    };
  }
}

/** Duplicate a saved view (Block 33). The API copies filters + visibility and
 *  names the copy "<name> (Kopie)". */
export async function duplicateSavedView(id: string): Promise<SavedViewResult> {
  try {
    await api.request(`/api/v1/saved-views/${id}/duplicate`, { method: 'POST' });
    revalidatePath('/approvals');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Ansicht konnte nicht dupliziert werden.',
    };
  }
}
