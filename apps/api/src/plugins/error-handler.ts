/**
 * Global error handler: turns thrown errors into the standard error envelope.
 * Zod errors -> 422 VALIDATION_ERROR with field details.
 * ApiException -> its own status/code.
 * Anything else -> 500 INTERNAL_ERROR (details hidden in production).
 */
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import type { ApiErrorResponse, ApiFieldError } from '@saf/types';
import { ApiException } from '../lib/errors.js';
import { isProd } from '../config.js';

export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((err, req, reply) => {
    const requestId = req.id as string;

    if (err instanceof ZodError) {
      const details: ApiFieldError[] = err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      const body: ApiErrorResponse = {
        error: { code: 'VALIDATION_ERROR', message: 'Eingabe ungültig', details, requestId },
      };
      return reply.status(422).send(body);
    }

    if (err instanceof ApiException) {
      const body: ApiErrorResponse = {
        error: { code: err.code, message: err.message, details: err.details, requestId },
      };
      return reply.status(err.statusCode).send(body);
    }

    // Fastify surfaces client errors (malformed JSON body, schema validation,
    // unsupported media type…) with a 4xx statusCode. Map those to a clean
    // VALIDATION_ERROR envelope instead of a misleading 500.
    const status = (err as { statusCode?: number }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      const code =
        status === 401
          ? 'UNAUTHENTICATED'
          : status === 403
            ? 'FORBIDDEN'
            : status === 404
              ? 'NOT_FOUND'
              : status === 429
                ? 'RATE_LIMITED'
                : 'VALIDATION_ERROR';
      const body: ApiErrorResponse = {
        error: { code, message: err.message, requestId },
      };
      return reply.status(status).send(body);
    }

    req.log.error({ err }, 'Unhandled error');
    const body: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: isProd ? 'Interner Fehler' : err.message,
        requestId,
      },
    };
    return reply.status(500).send(body);
  });

  app.setNotFoundHandler((req, reply) => {
    const body: ApiErrorResponse = {
      error: { code: 'NOT_FOUND', message: 'Ressource nicht gefunden', requestId: req.id as string },
    };
    return reply.status(404).send(body);
  });
});
