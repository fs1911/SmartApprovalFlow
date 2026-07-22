/**
 * Thin API client for the web app.
 *
 * Auth (Block 7): a real session JWT is stored in the `saf_session` httpOnly
 * cookie and sent as `Authorization: Bearer <jwt>`. In development only, if
 * there is no session, we fall back to the dev header stub (x-saf-tenant /
 * x-saf-role) so the local demo + role switcher keep working.
 */
import { cookies } from 'next/headers';
import type { ApiResponse, ApiSuccessResponse } from '@saf/types';
import { webEnv } from './env';

const BASE = webEnv.apiBaseUrl;
const DEV_TENANT = webEnv.devTenant;
const DEFAULT_ROLE = webEnv.devRole;
const IS_DEV = process.env.NODE_ENV !== 'production';

/** httpOnly cookie holding the session JWT. */
export const SESSION_COOKIE = 'saf_session';
/** Cookie used by the dev role switcher (development only). */
export const ROLE_COOKIE = 'saf_role';

function authHeaders(): Record<string, string> {
  try {
    const jar = cookies();
    const session = jar.get(SESSION_COOKIE)?.value;
    if (session) return { authorization: `Bearer ${session}` };
    if (IS_DEV) {
      return {
        'x-saf-tenant': DEV_TENANT,
        'x-saf-role': jar.get(ROLE_COOKIE)?.value ?? DEFAULT_ROLE,
      };
    }
  } catch {
    /* outside request scope */
  }
  return {};
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Sent as Idempotency-Key on unsafe writes. */
  idempotencyKey?: string;
  /** Skip the dev auth headers (used for public/loginless endpoints). */
  publicRoute?: boolean;
  cache?: RequestCache;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (!opts.publicRoute) Object.assign(headers, authHeaders());
  if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache ?? 'no-store',
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !json || 'error' in json) {
    const err = json && 'error' in json ? json.error : null;
    throw new ApiClientError(
      res.status,
      err?.code ?? 'INTERNAL_ERROR',
      err?.message ?? `Request failed (${res.status})`,
    );
  }

  return (json as ApiSuccessResponse<T>).data;
}

export const api = {
  request,
  base: BASE,
};
