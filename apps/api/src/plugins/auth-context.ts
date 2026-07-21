/**
 * Auth context + tenant-scoped RBAC (Block 4).
 *
 * The real strategy (docs/api-design.md, adr-002/adr-004):
 *   - Web app users  -> short-lived JWT access token (Bearer)
 *   - Integrations   -> API keys with scopes
 * Both resolve to an AuthContext { tenantId, userId?, role, scopes }, where the
 * role always comes from the caller's *Membership in that tenant* — never a
 * global role.
 *
 * Block 4 still uses a DEV stub for credential verification, but it is now
 * membership-aware to exercise the real isolation path:
 *   x-saf-tenant: <tenant slug or id>   (defaults to the seeded demo tenant)
 *   x-saf-user:   <user email or id>    (optional; if set, role comes from the
 *                                        user's Membership — 403 if none)
 *   x-saf-role:   OWNER|ADMIN|SERVICE_ADVISOR|TECHNICIAN|VIEWER
 *                 (dev-only override, used when x-saf-user is not provided)
 *
 * Real credential verification (Block 5) replaces only `resolveContext`.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Permission, Role } from '@saf/types';
import { roleHasPermission } from '@saf/types';
import { prisma } from '@saf/db';
import { errors } from '../lib/errors.js';

export interface AuthContext {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  role: Role;
  scopes: string[];
  via: 'session' | 'api_key' | 'dev';
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest) => Promise<void>;
    /** Returns a preHandler that ensures auth AND the given permission. */
    requirePermission: (permission: Permission) => (req: FastifyRequest) => Promise<void>;
  }
}

async function resolveContext(req: FastifyRequest): Promise<AuthContext> {
  const tenantRef = (req.headers['x-saf-tenant'] as string | undefined) ?? 'muster-garage';
  const userRef = req.headers['x-saf-user'] as string | undefined;
  const headerRole = ((req.headers['x-saf-role'] as string | undefined) ?? 'SERVICE_ADVISOR') as Role;

  let tenant: { id: string; slug: string } | null = null;
  try {
    tenant = await prisma.tenant.findFirst({
      where: { OR: [{ slug: tenantRef }, { id: tenantRef }] },
      select: { id: true, slug: true },
    });
  } catch {
    // DB unavailable (e.g. bare checkout): fall back to a synthetic context so
    // /health and OpenAPI still work. RBAC below still applies to the role.
    return { tenantId: 'dev-tenant', tenantSlug: tenantRef, role: headerRole, scopes: ['*'], via: 'dev' };
  }
  if (!tenant) throw errors.unauthenticated('Unbekannter Workspace');

  // Membership-aware path: when a user is named, the role MUST come from an
  // actual membership in this tenant (this is the real isolation check).
  if (userRef) {
    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, OR: [{ email: userRef }, { id: userRef }] },
      select: { id: true, memberships: { where: { tenantId: tenant.id }, select: { role: true } } },
    });
    const membership = user?.memberships[0];
    if (!user || !membership) {
      throw errors.forbidden('Keine Mitgliedschaft in diesem Workspace');
    }
    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      userId: user.id,
      role: membership.role,
      scopes: ['*'],
      via: 'dev',
    };
  }

  // Dev override: role from header (no specific user).
  return { tenantId: tenant.id, tenantSlug: tenant.slug, role: headerRole, scopes: ['*'], via: 'dev' };
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
      if (!roleHasPermission(auth.role, permission)) {
        throw errors.forbidden(
          `Ihre Rolle (${auth.role}) hat keine Berechtigung für "${permission}".`,
        );
      }
    };
  });
});
