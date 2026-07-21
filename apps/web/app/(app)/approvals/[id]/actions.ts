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
