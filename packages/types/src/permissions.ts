/**
 * Tenant-scoped RBAC.
 *
 * A controlled permission set with a fixed role → permission matrix. Roles are
 * always evaluated *within a tenant* (via the caller's Membership), never
 * globally — see docs/decisions/adr-004-rbac-and-tenant-isolation.md.
 *
 * This is the single source of truth shared by API (enforcement) and web
 * (hiding/disabling actions), so the two never disagree.
 */
import type { Role } from './enums.js';

export const PERMISSIONS = [
  'cases:read', // view cases + timeline
  'cases:create', // create new approval cases
  'cases:send', // send, remind, (re)generate the customer link
  'cases:annotate', // add notes / attachments (technician)
  'templates:read',
  'templates:write',
  'members:read',
  'members:manage', // invite / change roles
  'workspace:read',
  'workspace:manage', // branding + workspace settings
  'reporting:read',
  'data:manage', // GDPR export / erasure + retention (OWNER/ADMIN only)
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

/**
 * Role → permissions. OWNER and ADMIN share the same permission set; the
 * OWNER-only capabilities (assigning the OWNER role, the last-owner guard) are
 * enforced as explicit business rules, not as a separate permission.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL,
  SERVICE_ADVISOR: [
    'cases:read',
    'cases:create',
    'cases:send',
    'cases:annotate',
    'templates:read',
    'workspace:read',
    'members:read',
    'reporting:read',
  ],
  TECHNICIAN: ['cases:read', 'cases:annotate', 'workspace:read'],
  VIEWER: ['cases:read', 'templates:read', 'workspace:read', 'members:read', 'reporting:read'],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Who may set a membership to `targetRole`. Requires members:manage, and only
 * an OWNER may grant the OWNER role (ADMINs manage everything below owner).
 */
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (!roleHasPermission(actorRole, 'members:manage')) return false;
  if (targetRole === 'OWNER') return actorRole === 'OWNER';
  return true;
}
