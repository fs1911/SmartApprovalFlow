/**
 * Consistent API envelope + error format shared by API and web.
 *
 * Every JSON response uses one of two shapes:
 *   success -> { data: T, meta?: {...} }
 *   error   -> { error: { code, message, details? } }
 *
 * This mirrors docs/api-design.md. Keeping it in a shared package means the
 * web app and any future integration client can rely on a stable contract.
 */

/** Machine-readable, stable error codes. Add to this union, never repurpose. */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'IDEMPOTENCY_KEY_REUSED',
  'RATE_LIMITED',
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'CASE_NOT_ACTIONABLE',
  'PLAN_LIMIT_REACHED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiFieldError {
  /** Dot-path of the offending field, e.g. "vehicle.plate". */
  path: string;
  message: string;
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** Optional field-level details, primarily for VALIDATION_ERROR. */
  details?: ApiFieldError[];
  /** Correlation id echoed from the X-Request-Id header, for support. */
  requestId?: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}

/** Cursor pagination meta. We use cursor (not offset) for stable listing. */
export interface PaginationMeta {
  /** Opaque cursor to pass as `?cursor=` for the next page; null at the end. */
  nextCursor: string | null;
  /** Page size that was applied. */
  limit: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PaginationMeta & Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Type guard for narrowing an ApiResponse at the call site. */
export function isApiError<T>(res: ApiResponse<T>): res is ApiErrorResponse {
  return (res as ApiErrorResponse).error !== undefined;
}
