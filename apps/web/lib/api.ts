/**
 * Thin API client for the web app.
 *
 * Block 2 note: authentication is still the dev header stub from the API
 * (x-saf-tenant / x-saf-role). When real auth lands (Block 5) only this file
 * changes — screens keep calling the same functions.
 */
import type { ApiResponse, ApiSuccessResponse } from '@saf/types';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
const DEV_TENANT = process.env.SAF_DEV_TENANT ?? 'muster-garage';
const DEV_ROLE = process.env.SAF_DEV_ROLE ?? 'SERVICE_ADVISOR';

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
  if (!opts.publicRoute) {
    headers['x-saf-tenant'] = DEV_TENANT;
    headers['x-saf-role'] = DEV_ROLE;
  }
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
