/**
 * v1 route tree. Everything here lives under /api/v1 (versioned per adr-002).
 */
import type { FastifyInstance } from 'fastify';
import { systemRoutes } from './system.js';
import { authRoutes } from './auth.js';
import { identityRoutes } from './identity.js';
import { approvalCaseRoutes } from './approval-cases.js';
import { templateRoutes } from './templates.js';
import { memberRoutes } from './members.js';
import { invitationRoutes } from './invitations.js';
import { onboardingRoutes } from './onboarding.js';
import { billingRoutes } from './billing.js';
import { workspaceRoutes } from './workspace.js';
import { reportingRoutes } from './reporting.js';
import { apiKeyRoutes } from './api-keys.js';
import { integrationRoutes } from './integration.js';
import { webhookRoutes } from './webhooks.js';
import { webhookEndpointRoutes } from './webhook-endpoints.js';
import { reminderRoutes } from './reminders.js';
import { maintenanceRoutes } from './maintenance.js';
import { uploadRoutes } from './uploads.js';
import { publicRoutes } from './public.js';

export async function registerV1Routes(app: FastifyInstance) {
  await app.register(systemRoutes);
  await app.register(authRoutes);
  await app.register(identityRoutes);
  await app.register(approvalCaseRoutes);
  await app.register(templateRoutes);
  await app.register(memberRoutes);
  await app.register(invitationRoutes);
  await app.register(onboardingRoutes);
  await app.register(billingRoutes);
  await app.register(workspaceRoutes);
  await app.register(reportingRoutes);
  await app.register(apiKeyRoutes);
  await app.register(integrationRoutes);
  await app.register(webhookRoutes);
  await app.register(webhookEndpointRoutes);
  await app.register(reminderRoutes);
  await app.register(maintenanceRoutes);
  await app.register(uploadRoutes);
  await app.register(publicRoutes);
}
