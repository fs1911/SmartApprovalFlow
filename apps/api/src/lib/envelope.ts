/**
 * Helpers to produce the standard success/error envelope consistently.
 */
import type { ApiSuccessResponse, PaginationMeta } from '@saf/types';

export function ok<T>(data: T, meta?: ApiSuccessResponse<T>['meta']): ApiSuccessResponse<T> {
  return meta ? { data, meta } : { data };
}

export function paginated<T>(
  data: T[],
  meta: PaginationMeta & Record<string, unknown>,
): ApiSuccessResponse<T[]> {
  return { data, meta };
}
