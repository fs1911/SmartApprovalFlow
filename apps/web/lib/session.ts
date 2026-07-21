/**
 * Server-side session helpers: fetch the current principal (/me) and check
 * permissions. Screens use `getMe()` to gate nav items and actions so the UI
 * matches what the API will actually allow.
 */
import { cache } from 'react';
import type { Permission } from '@saf/types';
import { api } from './api';

export interface Me {
  role: string;
  roleLabel: string;
  permissions: Permission[];
  tenant: { id: string; slug: string };
  user: { id: string; name: string; email: string } | null;
}

/** Cached per request so multiple components don't refetch. */
export const getMe = cache(async (): Promise<Me | null> => {
  try {
    return await api.request<Me>('/api/v1/me');
  } catch {
    return null;
  }
});

export function can(me: Me | null, permission: Permission): boolean {
  return !!me?.permissions.includes(permission);
}
