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
import { ROLE_LABELS, ROLE_PERMISSIONS, passwordForgotSchema, passwordResetSchema } from '@saf/types';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { verifyPassword, hashPassword } from '../../lib/password.js';
import { signSession } from '../../lib/jwt.js';
import { dispatchMessage } from '../../lib/notifications.js';
import {
  issueVerificationToken,
  hashVerificationToken,
  expiryFromHours,
  isTokenValid,
} from '../../lib/verification.js';
import { config } from '../../config.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginRateLimit = {
  rateLimit: { max: config.RATE_LIMIT_LOGIN_MAX, timeWindow: config.RATE_LIMIT_WINDOW },
};

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

  // --- Forgot password (loginless, uniform response) -----------------------
  app.post(
    '/auth/forgot-password',
    {
      config: loginRateLimit,
      schema: {
        tags: ['auth'],
        summary: 'Request a password reset link',
        description:
          'Always responds success — never reveals whether the e-mail exists (anti-enumeration). If a matching active user exists, a reset link is e-mailed.',
      },
    },
    async (req) => {
      const { email } = passwordForgotSchema.parse(req.body);

      // There may be one user per tenant with this e-mail; reset each.
      const users = await prisma.user.findMany({
        where: { email, isActive: true },
        select: { id: true, name: true, tenantId: true, tenant: { select: { name: true, brandName: true } } },
      });

      for (const user of users) {
        const { token, tokenHash } = issueVerificationToken();
        await prisma.verificationToken.create({
          data: {
            tenantId: user.tenantId,
            type: 'PASSWORD_RESET',
            tokenHash,
            email,
            userId: user.id,
            expiresAt: expiryFromHours(config.PASSWORD_RESET_TTL_HOURS),
          },
        });
        const workspaceName = user.tenant.brandName ?? user.tenant.name;
        const resetUrl = `${config.WEB_BASE_URL}/reset-password/${token}`;
        await dispatchMessage({
          tenantId: user.tenantId,
          channel: 'EMAIL',
          toAddress: email,
          templateKey: 'password_reset_email',
          subject: `Passwort zurücksetzen — ${workspaceName}`,
          body: `Guten Tag ${user.name}\n\nSetzen Sie hier ein neues Passwort: ${resetUrl}\n\nDer Link ist ${config.PASSWORD_RESET_TTL_HOURS} Stunden gültig. Falls Sie das nicht angefragt haben, ignorieren Sie diese E-Mail.`,
        });
        await prisma.auditEvent.create({
          data: { tenantId: user.tenantId, type: 'PASSWORD_RESET_REQUESTED', actorType: 'USER', actorUserId: user.id },
        });
      }

      // Uniform response regardless of whether a user was found.
      return ok({ ok: true });
    },
  );

  // --- Reset password with a token (loginless) -----------------------------
  app.post(
    '/auth/reset-password',
    {
      config: loginRateLimit,
      schema: {
        tags: ['auth'],
        summary: 'Set a new password using a reset token',
      },
    },
    async (req) => {
      const { token, password } = passwordResetSchema.parse(req.body);
      const record = await prisma.verificationToken.findUnique({
        where: { tokenHash: hashVerificationToken(token) },
      });
      if (!record || record.type !== 'PASSWORD_RESET' || !record.userId || !isTokenValid(record)) {
        throw errors.tokenInvalid('Der Link ist ungültig oder abgelaufen.');
      }

      const passwordHash = await hashPassword(password);
      await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
        prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
        // Any other outstanding reset tokens for this user are now moot.
        prisma.verificationToken.updateMany({
          where: { userId: record.userId, type: 'PASSWORD_RESET', consumedAt: null, id: { not: record.id } },
          data: { revokedAt: new Date() },
        }),
        prisma.auditEvent.create({
          data: { tenantId: record.tenantId, type: 'PASSWORD_RESET_COMPLETED', actorType: 'USER', actorUserId: record.userId },
        }),
      ]);
      return ok({ ok: true });
    },
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
