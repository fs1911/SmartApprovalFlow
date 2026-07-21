'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ROLE_COOKIE } from '@/lib/api';

/**
 * Dev-only: impersonate a role by setting a cookie. This exists so RBAC is
 * demonstrable in the running app; it disappears when real auth lands (Block 5).
 */
export async function setRole(role: string): Promise<void> {
  cookies().set(ROLE_COOKIE, role, { httpOnly: true, sameSite: 'lax', path: '/' });
  revalidatePath('/', 'layout');
}
