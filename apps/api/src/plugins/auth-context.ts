/**
 * Auth context + tenant-scoped RBAC (Block 7: real auth).
 *
 * A request is authenticated via, in order:
 *   1. Session JWT       Authorization: Bearer <jwt>        (web app users)
 *   2. API key           Authorization: Bearer saf_live_... (integrations)
 *   3. Dev header        x-saf-tenant / x-saf-role          (ONLY when NODE_ENV
 *                        !== 'production' — the local demo escape hatch)
 *
 * All three resolve to the same AuthContext with a concrete `permissions` list:
 *   - session/dev → permissions of the caller's Membership role in the tenant
 *   - api key     → the key's granted scopes (a subset of the Permission set)
 * `requirePermission` checks that list, so users and integrations share one RBAC
 * path. The role is always re-resolved from the membership (never trusted from
 * the token) so a role change takes effect immediately.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Permission, Role } from '@saf/types';
import { ROLE_PERMISSIONS } from '@saf/types';
import { prisma } from '@saf/db';
import { errors } from '../lib/errors.js';
import { config } from '../config.js';
import { verifySession } from '../lib/jwt.js';
import { hashApiKey, parseScopes } from '../lib/api-keys.js';

export interface AuthContext {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  /** Present for user/dev auth; absent for API-key auth. */
  role?: Role;
  /** Effective permissions for this caller (role-derived or key scopes). */
  permissions: Permission[];
  via: 'session' | 'api_key' | 'dev';
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest) => Promise<void>;
    requirePermission: (permission: Permission) => (req: FastifyRequest) => Promise<void>;
  }
}

function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

async function fromApiKey(raw: string): Promise<AuthContext> {
  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(raw) },
    include: { tenant: { select: { id: true, slug: true } } },
  });
  if (!key || key.revokedAt) throw errors.unauthenticated('Ungültiger API-Key');
  // Best-effort last-used timestamp (never blocks the request).
  void prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return {
    tenantId: key.tenantId,
    tenantSlug: key.tenant.slug,
    permissions: parseScopes(key.scopes),
    via: 'api_key',
  };
}

async function fromSession(token: string): Promise<AuthContext> {
  const claims = await verifySession(token);
  if (!claims) throw errors.unauthenticated('Sitzung ungültig oder abgelaufen');
  const user = await prisma.user.findFirst({
    where: { id: claims.sub, tenantId: claims.tenantId },
    select: {
      id: true,
      tenant: { select: { id: true, slug: true } },
      memberships: { where: { tenantId: claims.tenantId }, select: { role: true } },
    },
  });
  const membership = user?.memberships[0];
  if (!user || !membership) throw errors.forbidden('Keine Mitgliedschaft in diesem Workspace');
  return {
    tenantId: user.tenant.id,
    tenantSlug: user.tenant.slug,
    userId: user.id,
    role: membership.role,
    permissions: ROLE_PERMISSIONS[membership.role],
    via: 'session',
  };
}

async function fromDevHeaders(req: FastifyRequest): Promise<AuthContext> {
  const tenantRef = (req.headers['x-saf-tenant'] as string | undefined) ?? 'muster-garage';
  const role = ((req.headers['x-saf-role'] as string | undefined) ?? 'SERVICE_ADVISOR') as Role;
  const tenant = await prisma.tenant
    .findFirst({ where: { OR: [{ slug: tenantRef }, { id: tenantRef }] }, select: { id: true, slug: true } })
    .catch(() => null);
  if (!tenant) {
    // Synthetic context so /health, OpenAPI, etc. still work without a DB.
    return { tenantId: 'dev-tenant', tenantSlug: tenantRef, role, permissions: ROLE_PERMISSIONS[role], via: 'dev' };
  }
  return { tenantId: tenant.id, tenantSlug: tenant.slug, role, permissions: ROLE_PERMISSIONS[role], via: 'dev' };
}

async function resolveContext(req: FastifyRequest): Promise<AuthContext> {
  const token = bearer(req);
  if (token) {
    return token.startsWith('saf_') ? fromApiKey(token) : fromSession(token);
  }
  // Dev header fallback — never in production.
  if (config.NODE_ENV !== 'production') {
    return fromDevHeaders(req);
  }
  throw errors.unauthenticated();
}

async function ensureAuth(req: FastifyRequest): Promise<AuthContext> {
  if (!req.auth) req.auth = await resolveContext(req);
  return req.auth;
}

export const authContextPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('requireAuth', async (req: FastifyRequest) => {
    await ensureAuth(req);
  });

  app.decorate('requirePermission', (permission: Permission) => {
    return async (req: FastifyRequest) => {
      const auth = await ensureAuth(req);
      if (!auth.permissions.includes(permission)) {
        const who = auth.role ?? `API-Key`;
        throw errors.forbidden(`${who} hat keine Berechtigung für "${permission}".`);
      }
    };
  });
});
