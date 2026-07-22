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

export interface InviteResult {
  ok: boolean;
  error?: string;
  /** Dev only: the accept link (no real mailbox needed locally). */
  acceptUrl?: string;
}

export async function inviteMember(email: string, role: string): Promise<InviteResult> {
  if (!email) return { ok: false, error: 'Bitte E-Mail eingeben.' };
  try {
    const res = await api.request<{ acceptUrl?: string }>('/api/v1/invitations', {
      method: 'POST',
      body: { email, role },
    });
    revalidatePath('/members');
    return { ok: true, acceptUrl: res.acceptUrl };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Einladung fehlgeschlagen.' };
  }
}

export async function revokeInvite(id: string): Promise<RoleChangeResult> {
  try {
    await api.request(`/api/v1/invitations/${id}`, { method: 'DELETE' });
    revalidatePath('/members');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiClientError ? e.message : 'Widerruf fehlgeschlagen.' };
  }
}
