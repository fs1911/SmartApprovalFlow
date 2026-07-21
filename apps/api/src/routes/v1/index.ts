/**
 * v1 route tree. Everything here lives under /api/v1 (versioned per adr-002).
 */
import type { FastifyInstance } from 'fastify';
import { systemRoutes } from './system.js';
import { identityRoutes } from './identity.js';
import { approvalCaseRoutes } from './approval-cases.js';
import { templateRoutes } from './templates.js';
import { memberRoutes } from './members.js';
import { workspaceRoutes } from './workspace.js';
import { reportingRoutes } from './reporting.js';
import { publicRoutes } from './public.js';

export async function registerV1Routes(app: FastifyInstance) {
  await app.register(systemRoutes);
  await app.register(identityRoutes);
  await app.register(approvalCaseRoutes);
  await app.register(templateRoutes);
  await app.register(memberRoutes);
  await app.register(workspaceRoutes);
  await app.register(reportingRoutes);
  await app.register(publicRoutes);
}
