'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiClientError, SESSION_COOKIE, ROLE_COOKIE } from '@/lib/api';

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Bitte E-Mail und Passwort eingeben.' };

  let token: string;
  try {
    const res = await api.request<{ token: string }>('/api/v1/auth/login', {
      method: 'POST',
      publicRoute: true, // login itself carries no session
      body: { email, password },
    });
    token = res.token;
  } catch (e) {
    if (e instanceof ApiClientError && (e.status === 401 || e.status === 429)) {
      return { error: e.message };
    }
    return { error: 'Anmeldung fehlgeschlagen. Bitte später erneut versuchen.' };
  }

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12, // mirror the JWT TTL (12h)
  });
  redirect('/dashboard');
}

export async function logout(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
  cookies().delete(ROLE_COOKIE);
  redirect('/login');
}

// --- Onboarding: password reset + invitation acceptance (Block 10) ---------

export interface SimpleState {
  ok?: boolean;
  error?: string;
}

/** Always reports success — the API is uniform to prevent user enumeration. */
export async function requestPasswordReset(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Bitte E-Mail eingeben.' };
  try {
    await api.request('/api/v1/auth/forgot-password', {
      method: 'POST',
      publicRoute: true,
      body: { email },
    });
  } catch {
    /* uniform: never leak status */
  }
  return { ok: true };
}

export async function resetPassword(token: string, _prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { error: 'Passwort muss mindestens 8 Zeichen haben.' };
  try {
    await api.request('/api/v1/auth/reset-password', {
      method: 'POST',
      publicRoute: true,
      body: { token, password },
    });
  } catch (e) {
    return { error: e instanceof ApiClientError ? e.message : 'Zurücksetzen fehlgeschlagen.' };
  }
  return { ok: true };
}

/** Accept an invitation, set the password, and start a session (auto-login). */
export async function acceptInvite(token: string, _prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { error: 'Passwort muss mindestens 8 Zeichen haben.' };

  let sessionToken: string;
  try {
    const res = await api.request<{ token: string }>('/api/v1/invitations/accept', {
      method: 'POST',
      publicRoute: true,
      body: { token, name: name || undefined, password },
    });
    sessionToken = res.token;
  } catch (e) {
    return { error: e instanceof ApiClientError ? e.message : 'Einladung konnte nicht angenommen werden.' };
  }

  cookies().set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12,
  });
  redirect('/dashboard');
}
