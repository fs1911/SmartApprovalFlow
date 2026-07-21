/**
 * Auth context (Block 1 stub).
 *
 * The real strategy (documented in docs/api-design.md and adr-002):
 *   - Web app users  -> short-lived JWT access token (Bearer)
 *   - Integrations   -> API keys (Authorization: Bearer saf_live_...) with scopes
 * Both resolve to the same AuthContext { tenantId, userId?, role, scopes }.
 *
 * For Block 1 we do NOT implement real credential verification yet. Instead we
 * resolve a development context from headers so the endpoints are exercisable
 * end-to-end. This is deliberately swapped for real auth in Block 5.
 *
 * Dev headers:
 *   x-saf-tenant: <tenant slug or id>   (defaults to the seeded demo tenant)
 *   x-saf-role:   OWNER|ADMIN|SERVICE_ADVISOR|TECHNICIAN
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Role } from '@saf/types';
import { prisma } from '@saf/db';
import { errors } from '../lib/errors.js';

export interface AuthContext {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  role: Role;
  scopes: string[];
  /** How the caller authenticated. */
  via: 'session' | 'api_key' | 'dev';
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Present after `requireAuth` runs. */
    auth?: AuthContext;
  }
}

async function resolveDevContext(req: FastifyRequest): Promise<AuthContext> {
  const tenantRef = (req.headers['x-saf-tenant'] as string | undefined) ?? 'muster-garage';
  const role = ((req.headers['x-saf-role'] as string | undefined) ?? 'SERVICE_ADVISOR') as Role;

  // NOTE: DB may be unavailable in a bare Block-1 checkout. Fall back to a
  // synthetic context so /health and OpenAPI still work without Postgres.
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ slug: tenantRef }, { id: tenantRef }] },
      select: { id: true, slug: true },
    });
    if (tenant) {
      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        role,
        scopes: ['*'],
        via: 'dev',
      };
    }
  } catch {
    // ignore — fall through to synthetic context
  }

  return {
    tenantId: 'dev-tenant',
    tenantSlug: tenantRef,
    role,
    scopes: ['*'],
    via: 'dev',
  };
}

export const authContextPlugin = fp(async (app: FastifyInstance) => {
  /**
   * Attach an auth context or throw 401. Register as a route `preHandler`.
   * Endpoints under /api/v1/public/** must NOT use this (they are loginless).
   */
  app.decorate('requireAuth', async (req: FastifyRequest) => {
    // Block 1: always resolve a dev context. Block 5 replaces this with real
    // JWT / API-key verification and throws errors.unauthenticated() on failure.
    req.auth = await resolveDevContext(req);
    if (!req.auth) throw errors.unauthenticated();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest) => Promise<void>;
  }
}
