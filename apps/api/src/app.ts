/**
 * Fastify application factory. Wires plugins, OpenAPI docs and the versioned
 * route tree. Exported separately from server.ts so it can be imported by
 * tests and the OpenAPI export script without binding a port.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { authContextPlugin } from './plugins/auth-context.js';
import { registerV1Routes } from './routes/v1/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL ?? (config.NODE_ENV === 'production' ? 'info' : 'debug'),
      // Never log secrets: redact auth headers, cookies and API keys. Applies to
      // the structured request/response log records pino emits.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-saf-sink-secret"]',
          'req.headers["idempotency-key"]',
        ],
        censor: '[redacted]',
      },
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
    // Correlation id echoed back as X-Request-Id and into every error envelope.
    genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });

  // Tolerate bodyless POSTs that still carry `content-type: application/json`
  // (e.g. generate-public-link). Fastify's default parser rejects an empty
  // body; we treat empty/whitespace as {}.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body: string, done) => {
      if (body == null || body.trim() === '') {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(body));
      } catch (err) {
        (err as Error & { statusCode?: number }).statusCode = 400;
        done(err as Error, undefined);
      }
    },
  );

  // Raw binary bodies for the local attachment upload endpoint (Block 8). The
  // client PUTs image bytes; we buffer them so the storage driver can persist
  // them. Cloud drivers upload straight to the provider and never hit this path.
  app.addContentTypeParser(
    ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/octet-stream'],
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );

  await app.register(cors, {
    origin: [config.WEB_BASE_URL],
    credentials: true,
  });

  // Rate limiting: a global per-IP default; routes tighten it via their own
  // `config.rateLimit` (public customer endpoints + login). Returns the standard
  // error envelope with code RATE_LIMITED on 429.
  // The plugin raises a 429 error which our global error handler formats into
  // the standard envelope (code RATE_LIMITED). Routes tighten `max` via their
  // own config.rateLimit (public customer endpoints + login).
  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
  });

  // --- OpenAPI (source of truth generated from the running app) ------------
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Klarwerk API',
        description:
          'Public REST API for Klarwerk. All responses use a consistent envelope. See docs/api-design.md.',
        version: '1.0.0-block1',
      },
      servers: [{ url: config.API_BASE_URL, description: 'Local development' }],
      tags: [
        { name: 'system', description: 'Health & meta' },
        { name: 'auth', description: 'Login, logout, session' },
        { name: 'identity', description: 'Current user & tenants' },
        { name: 'api-keys', description: 'Integration API keys & scopes' },
        { name: 'webhooks', description: 'Outbound webhook delivery' },
        { name: 'approval-cases', description: 'Approval workflow (the wedge)' },
        { name: 'templates', description: 'Outbound message templates' },
        { name: 'members', description: 'Workspace members & roles (RBAC)' },
        { name: 'workspace', description: 'Workspace settings & white-label branding' },
        { name: 'reporting', description: 'Operational metrics' },
        { name: 'public', description: 'Loginless customer-facing endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Session JWT (users) or API key (integrations, Block 5).',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  await app.register(errorHandlerPlugin);
  await app.register(authContextPlugin);

  await app.register(registerV1Routes, { prefix: '/api/v1' });

  // Root convenience redirect to the interactive docs.
  app.get('/', { schema: { hide: true } }, async (_req, reply) => reply.redirect('/docs'));

  return app;
}
