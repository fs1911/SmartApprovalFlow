/**
 * Authentication endpoints.
 *
 *   POST /api/v1/auth/login     e-mail + password  → session JWT
 *   POST /api/v1/auth/logout    stateless (client discards the token)
 *   GET  /api/v1/auth/session   current principal (requires auth)
 *
 * Login is rate-limited harder than the global default (brute-force guard).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@saf/db';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@saf/types';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { verifyPassword } from '../../lib/password.js';
import { signSession } from '../../lib/jwt.js';
import { config } from '../../config.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/login',
    {
      config: { rateLimit: { max: config.RATE_LIMIT_LOGIN_MAX, timeWindow: config.RATE_LIMIT_WINDOW } },
      schema: {
        tags: ['auth'],
        summary: 'Log in with e-mail and password; returns a session JWT',
      },
    },
    async (req) => {
      const { email, password } = loginSchema.parse(req.body);

      // A user's e-mail is unique per tenant; match across tenants and verify.
      const candidates = await prisma.user.findMany({
        where: { email, isActive: true },
        include: {
          tenant: { select: { id: true, slug: true } },
          memberships: { select: { role: true } },
        },
      });

      for (const user of candidates) {
        if (await verifyPassword(password, user.passwordHash)) {
          const role = user.memberships[0]?.role;
          if (!role) continue; // no membership → cannot log in to this workspace
          const token = await signSession({ sub: user.id, tenantId: user.tenantId });
          return ok({
            token,
            user: { id: user.id, name: user.name, email: user.email },
            tenant: user.tenant,
            role,
            roleLabel: ROLE_LABELS[role],
            permissions: ROLE_PERMISSIONS[role],
          });
        }
      }

      // Uniform error — never reveal whether the e-mail exists.
      throw errors.unauthenticated('E-Mail oder Passwort ist falsch.');
    },
  );

  app.post(
    '/auth/logout',
    { schema: { tags: ['auth'], summary: 'Log out (stateless — discard the token client-side)' } },
    async () => ok({ ok: true }),
  );

  app.get(
    '/auth/session',
    {
      preHandler: app.requireAuth,
      schema: { tags: ['auth'], summary: 'Current session principal', security: [{ bearerAuth: [] }] },
    },
    async (req) => {
      const auth = req.auth!;
      return ok({
        tenant: { id: auth.tenantId, slug: auth.tenantSlug },
        userId: auth.userId ?? null,
        role: auth.role ?? null,
        permissions: auth.permissions,
        via: auth.via,
      });
    },
  );
}
