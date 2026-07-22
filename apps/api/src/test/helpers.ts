/**
 * Integration-test helpers (Block 9).
 *
 * Builds the real Fastify app and drives it via `inject` — no network, no ports.
 * Auth uses the dev-header stub (allowed because NODE_ENV !== 'production' under
 * the test runner), so tests exercise the full route + RBAC + DB path without
 * minting JWTs. Requires the seeded `muster-garage` tenant; `dbAvailable()` lets
 * suites skip cleanly when no database is reachable (e.g. a pure-unit CI stage).
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@saf/db';
import type { Role } from '@saf/types';
import { buildApp } from '../app.js';

export const TENANT = 'muster-garage';

let appPromise: Promise<FastifyInstance> | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) appPromise = buildApp();
  return appPromise;
}

/** True when the seeded tenant is reachable — gate integration suites on this. */
export async function dbAvailable(): Promise<boolean> {
  try {
    const t = await prisma.tenant.findFirst({ where: { slug: TENANT }, select: { id: true } });
    return !!t;
  } catch {
    return false;
  }
}

/** Dev-auth headers for a given role (defaults to OWNER). */
export function authHeaders(role: Role = 'OWNER'): Record<string, string> {
  return { 'x-saf-tenant': TENANT, 'x-saf-role': role };
}

interface InjectOpts {
  role?: Role;
  headers?: Record<string, string>;
  payload?: unknown;
}

/** Convenience wrapper: inject with dev auth + JSON, returning { status, body }. */
export async function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  url: string,
  opts: InjectOpts = {},
): Promise<{ status: number; body: any }> {
  const app = await getApp();
  const res = await app.inject({
    method,
    url,
    headers: { ...authHeaders(opts.role), ...(opts.headers ?? {}) },
    payload: opts.payload as object | undefined,
  });
  let body: unknown = null;
  try {
    body = res.json();
  } catch {
    body = res.body;
  }
  return { status: res.statusCode, body };
}

/** A minimal valid create-case payload. */
export function sampleCase(overrides: Record<string, unknown> = {}) {
  return {
    subject: 'Integrationstest-Fall',
    customer: { name: 'Testkunde', email: 'test@example.com' },
    items: [{ title: 'Bremsbeläge vorne', priceBand: { minMinor: 18000, maxMinor: 24000, currency: 'CHF' } }],
    ...overrides,
  };
}
