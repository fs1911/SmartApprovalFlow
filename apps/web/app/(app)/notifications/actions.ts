'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiClientError } from '@/lib/api';

export async function markRead(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.request(`/api/v1/notifications/${id}/read`, { method: 'POST' });
    revalidatePath('/notifications');
    revalidatePath('/(app)', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Fehler' };
  }
}

export async function markAllRead(): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.request('/api/v1/notifications/read-all', { method: 'POST' });
    revalidatePath('/notifications');
    revalidatePath('/(app)', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Fehler' };
  }
}
