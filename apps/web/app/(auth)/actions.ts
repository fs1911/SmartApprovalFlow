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
