'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiClientError } from '@/lib/api';

export interface RoleChangeResult {
  ok: boolean;
  error?: string;
}

export async function changeMemberRole(id: string, role: string): Promise<RoleChangeResult> {
  try {
    await api.request(`/api/v1/members/${id}`, { method: 'PATCH', body: { role } });
    revalidatePath('/members');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Rolle konnte nicht geändert werden.',
    };
  }
}
