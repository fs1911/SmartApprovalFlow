/**
 * Workspace member management (tenant-scoped).
 *
 *   GET   /api/v1/members        list members (users + roles)
 *   PATCH /api/v1/members/:id    change a member's role
 *
 * Guardrails:
 *   - members:read to list, members:manage to change roles.
 *   - Only an OWNER may grant the OWNER role (canAssignRole).
 *   - The last OWNER cannot be demoted (a workspace always keeps an owner).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES, ROLE_LABELS, canAssignRole } from '@saf/types';
import type { Role } from '@saf/types';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import { errors } from '../../lib/errors.js';

const updateMemberSchema = z.object({ role: z.enum(ROLES) });

export async function memberRoutes(app: FastifyInstance) {
  app.get(
    '/members',
    {
      preHandler: app.requirePermission('members:read'),
      schema: {
        tags: ['members'],
        summary: 'List workspace members and their roles',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req) => {
      const auth = req.auth!;
      const memberships = await prisma.membership.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
      });
      return ok(
        memberships.map((m) => ({
          id: m.id,
          role: m.role,
          roleLabel: ROLE_LABELS[m.role],
          user: m.user,
          isSelf: m.userId === auth.userId,
        })),
      );
    },
  );

  app.patch(
    '/members/:id',
    {
      preHandler: app.requirePermission('members:manage'),
      schema: {
        tags: ['members'],
        summary: 'Change a member’s role',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    async (req) => {
      const auth = req.auth!;
      const { id } = req.params as { id: string };
      const { role } = updateMemberSchema.parse(req.body);

      // Role assignment is a human/owner action — require a user session.
      if (!auth.role) throw errors.forbidden('Mitgliederverwaltung erfordert eine Nutzer-Sitzung.');

      const membership = await prisma.membership.findFirst({
        where: { id, tenantId: auth.tenantId },
      });
      if (!membership) throw errors.notFound('Mitglied nicht gefunden');

      // Only an OWNER may grant OWNER; ADMINs manage everything below owner.
      if (!canAssignRole(auth.role, role as Role)) {
        throw errors.forbidden('Diese Rollenzuweisung ist Ihrer Rolle nicht erlaubt.');
      }
      // Guard the last owner: never leave a workspace without one.
      if (membership.role === 'OWNER' && role !== 'OWNER') {
        const ownerCount = await prisma.membership.count({
          where: { tenantId: auth.tenantId, role: 'OWNER' },
        });
        if (ownerCount <= 1) {
          throw errors.conflict('Der letzte Inhaber kann nicht herabgestuft werden.');
        }
      }

      const updated = await prisma.membership.update({
        where: { id },
        data: { role: role as Role },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      return ok({ id: updated.id, role: updated.role, roleLabel: ROLE_LABELS[updated.role], user: updated.user });
    },
  );
}
