/**
 * Typed API errors. Throw these from routes; the global error handler
 * translates them into the standard error envelope (see lib/envelope.ts).
 */
import type { ApiErrorCode, ApiFieldError } from '@saf/types';

export class ApiException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: ApiFieldError[],
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export const errors = {
  validation: (message: string, details?: ApiFieldError[]) =>
    new ApiException(422, 'VALIDATION_ERROR', message, details),
  unauthenticated: (message = 'Authentifizierung erforderlich') =>
    new ApiException(401, 'UNAUTHENTICATED', message),
  forbidden: (message = 'Keine Berechtigung') => new ApiException(403, 'FORBIDDEN', message),
  notFound: (message = 'Nicht gefunden') => new ApiException(404, 'NOT_FOUND', message),
  conflict: (message = 'Konflikt') => new ApiException(409, 'CONFLICT', message),
  idempotencyReuse: (message = 'Idempotency-Key wurde mit anderem Payload wiederverwendet') =>
    new ApiException(409, 'IDEMPOTENCY_KEY_REUSED', message),
  tokenInvalid: (message = 'Ungültiger Link') => new ApiException(404, 'TOKEN_INVALID', message),
  tokenExpired: (message = 'Link abgelaufen') => new ApiException(410, 'TOKEN_EXPIRED', message),
  caseNotActionable: (message = 'Fall kann nicht mehr bearbeitet werden') =>
    new ApiException(409, 'CASE_NOT_ACTIONABLE', message),
  serviceUnavailable: (message = 'Service nicht bereit') =>
    new ApiException(503, 'SERVICE_UNAVAILABLE', message),
  internal: (message = 'Interner Fehler') => new ApiException(500, 'INTERNAL_ERROR', message),
};
