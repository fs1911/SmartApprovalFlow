/**
 * Member invitations (Block 10).
 *
 *   POST   /api/v1/invitations          create + e-mail an invite (members:manage)
 *   GET    /api/v1/invitations          list pending invites     (members:read)
 *   DELETE /api/v1/invitations/:id      revoke an invite         (members:manage)
 *   POST   /api/v1/invitations/accept   accept + set password    (loginless)
 *
 * Security: only the SHA-256 token hash is stored; the raw token lives only in
 * the e-mailed link. Accept is loginless + rate-limited and returns uniform
 * errors so a stranger can't probe which tokens exist.
 */
import type { FastifyInstance } from 'fastify';
import { inviteCreateSchema, inviteAcceptSchema, ROLE_LABELS, ROLE_PERMISSIONS } from '@saf/types';
import type { Role } from '@saf/types';
import { prisma } from '@saf/db';
import { config } from '../../config.js';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';
import { hashPassword } from '../../lib/password.js';
import { signSession } from '../../lib/jwt.js';
import { dispatchMessage } from '../../lib/notifications.js';
import {
  issueVerificationToken,
  hashVerificationToken,
  expiryFromHours,
  isTokenValid,
} from '../../lib/verification.js';
import { assertWithinSeatLimit } from '../../lib/usage.js';

const publicRateLimit = {
  rateLimit: { max: config.RATE_LIMIT_PUBLIC_MAX, timeWindow: config.RATE_LIMIT_WINDOW },
};

export async function invitationRoutes(app: FastifyInstance) {
  // --- Create + send -------------------------------------------------------
  app.post(
    '/invitations',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['members'],
        summary: 'Invite a new member (e-mails a secure set-password link)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const input = inviteCreateSchema.parse(req.body);
      if (!auth.role) throw errors.forbidden('Einladungen erfordern eine Nutzer-Sitzung.');

      // Already a member? Don't invite twice.
      const existing = await prisma.user.findFirst({
        where: { tenantId: auth.tenantId, email: input.email },
        select: { id: true },
      });
      if (existing) throw errors.conflict('Diese Person ist bereits Mitglied des Workspaces.');

      // Plan enforcement: an outstanding invite consumes a seat.
      await assertWithinSeatLimit(auth.tenantId);

      // Supersede any earlier pending invite for the same e-mail.
      await prisma.verificationToken.updateMany({
        where: { tenantId: auth.tenantId, email: input.email, type: 'INVITE', consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      const { token, tokenHash } = issueVerificationToken();
      const invitation = await prisma.verificationToken.create({
        data: {
          tenantId: auth.tenantId,
          type: 'INVITE',
          tokenHash,
          email: input.email,
          role: input.role as Role,
          invitedById: auth.userId ?? null,
          expiresAt: expiryFromHours(config.INVITE_TTL_HOURS),
        },
      });

      const tenant = await prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: { name: true, brandName: true },
      });
      const workspaceName = tenant?.brandName ?? tenant?.name ?? 'Nicka';
      const acceptUrl = `${config.WEB_BASE_URL}/invite/${token}`;

      await dispatchMessage({
        tenantId: auth.tenantId,
        channel: 'EMAIL',
        toAddress: input.email,
        templateKey: 'member_invite_email',
        subject: `Einladung zu ${workspaceName}`,
        body: `Sie wurden als ${ROLE_LABELS[input.role as Role]} zu ${workspaceName} eingeladen.\n\nZugang einrichten: ${acceptUrl}\n\nDer Link ist ${config.INVITE_TTL_HOURS} Stunden gültig.`,
      });

      await prisma.auditEvent.create({
        data: {
          tenantId: auth.tenantId,
          type: 'MEMBER_INVITED',
          actorType: 'USER',
          actorUserId: auth.userId ?? null,
          metadata: { email: input.email, role: input.role },
        },
      });

      return reply.status(201).send(
        ok({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
          // The raw token/link is returned once so the dev flow works without a
          // real mailbox; in production the recipient uses the e-mailed link.
          acceptUrl: config.NODE_ENV !== 'production' ? acceptUrl : undefined,
        }),
      );
    },
  );

  // --- List pending --------------------------------------------------------
  app.get(
    '/invitations',
    {
      preHandler: app.requirePermission('members:read'),
      schema: { tags: ['members'], summary: 'List pending invitations', security: [{ bearerAuth: [] }] },
    },
    async (req) => {
      const auth = req.auth!;
      const rows = await prisma.verificationToken.findMany({
        where: { tenantId: auth.tenantId, type: 'INVITE', consumedAt: null, revokedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      const now = new Date();
      return ok(
        rows.map((r) => ({
          id: r.id,
          email: r.email,
          role: r.role,
          roleLabel: r.role ? ROLE_LABELS[r.role] : null,
          expiresAt: r.expiresAt.toISOString(),
          expired: r.expiresAt.getTime() <= now.getTime(),
          createdAt: r.createdAt.toISOString(),
        })),
      );
    },
  );

  // --- Revoke --------------------------------------------------------------
  app.delete(
    '/invitations/:id',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['members'],
        summary: 'Revoke a pending invitation',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req, reply) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const inv = await prisma.verificationToken.findFirst({
        where: { id, tenantId: auth.tenantId, type: 'INVITE' },
      });
      if (!inv) throw errors.notFound('Einladung nicht gefunden');
      await prisma.verificationToken.update({ where: { id }, data: { revokedAt: new Date() } });
      await prisma.auditEvent.create({
        data: {
          tenantId: auth.tenantId,
          type: 'MEMBER_INVITE_REVOKED',
          actorType: 'USER',
          actorUserId: auth.userId ?? null,
          metadata: { email: inv.email },
        },
      });
      return reply.status(200).send(ok({ revoked: true }));
    },
  );

  // --- Accept (loginless) --------------------------------------------------
  app.post(
    '/invitations/accept',
    {
      config: publicRateLimit,
      schema: {
        tags: ['members'],
        summary: 'Accept an invitation and set a password (loginless)',
        description: 'Creates the user + membership and returns a session so the invitee is logged in.',
      },
    },
    async (req, reply) => {
      const input = inviteAcceptSchema.parse(req.body);
      const invite = await prisma.verificationToken.findUnique({
        where: { tokenHash: hashVerificationToken(input.token) },
      });
      if (!invite || invite.type !== 'INVITE' || !isTokenValid(invite)) {
        throw errors.tokenInvalid('Einladung ist ungültig oder abgelaufen.');
      }

      const role = (invite.role ?? 'VIEWER') as Role;
      const passwordHash = await hashPassword(input.password);

      const result = await prisma.$transaction(async (tx) => {
        // The invitee might already exist (edge case); upsert the user by tenant+email.
        const existing = await tx.user.findFirst({
          where: { tenantId: invite.tenantId, email: invite.email },
          select: { id: true },
        });
        const user = existing
          ? await tx.user.update({
              where: { id: existing.id },
              data: { passwordHash, isActive: true, ...(input.name ? { name: input.name } : {}) },
            })
          : await tx.user.create({
              data: {
                tenantId: invite.tenantId,
                email: invite.email,
                name: input.name ?? invite.email.split('@')[0]!,
                passwordHash,
              },
            });

        await tx.membership.upsert({
          where: { tenantId_userId: { tenantId: invite.tenantId, userId: user.id } },
          update: { role },
          create: { tenantId: invite.tenantId, userId: user.id, role },
        });

        await tx.verificationToken.update({
          where: { id: invite.id },
          data: { consumedAt: new Date(), userId: user.id },
        });

        await tx.auditEvent.create({
          data: {
            tenantId: invite.tenantId,
            type: 'MEMBER_JOINED',
            actorType: 'USER',
            actorUserId: user.id,
            metadata: { email: invite.email, role },
          },
        });

        return user;
      });

      const token = await signSession({ sub: result.id, tenantId: invite.tenantId });
      const tenant = await prisma.tenant.findUnique({
        where: { id: invite.tenantId },
        select: { id: true, slug: true },
      });
      return reply.status(200).send(
        ok({
          token,
          user: { id: result.id, name: result.name, email: result.email },
          tenant,
          role,
          roleLabel: ROLE_LABELS[role],
          permissions: ROLE_PERMISSIONS[role],
        }),
      );
    },
  );
}
