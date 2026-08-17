/**
 * Shared approval-case list filters (Blocks 26/27/31).
 *
 * The approval-case list and the saved-view match counts (Block 34) must apply
 * exactly the same filter semantics, so the `where` builder lives here and is
 * used by both. Pagination (cursor) stays with the list handler — this module
 * only owns the *filter* portion.
 */
import type { Prisma } from '@saf/db';

/** Start of the rolling window for the `createdWithin` filter (Block 27). */
export function createdWithinCutoff(within: '7d' | '30d' | '90d' | '365d', now = new Date()): Date {
  const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[within];
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * The `createdAt` filter (Block 31). A free `createdFrom`/`createdTo` range wins
 * over the `createdWithin` preset; both range bounds are inclusive and
 * interpreted as whole UTC days. Returns undefined when no date filter is set.
 */
export function createdAtRange(q: {
  createdFrom?: string;
  createdTo?: string;
  createdWithin?: '7d' | '30d' | '90d' | '365d';
}): { gte?: Date; lte?: Date } | undefined {
  if (q.createdFrom || q.createdTo) {
    const range: { gte?: Date; lte?: Date } = {};
    if (q.createdFrom) range.gte = new Date(`${q.createdFrom}T00:00:00.000Z`);
    if (q.createdTo) range.lte = new Date(`${q.createdTo}T23:59:59.999Z`);
    return range;
  }
  if (q.createdWithin) return { gte: createdWithinCutoff(q.createdWithin) };
  return undefined;
}

/** The filter fields shared by the list query and a saved view. */
export interface CaseFilterInput {
  status?: string;
  category?: string;
  urgency?: string;
  createdWithin?: '7d' | '30d' | '90d' | '365d';
  createdFrom?: string;
  createdTo?: string;
  /** Only `'me'` is meaningful (assigned to the caller); needs a userId. */
  assignee?: string;
}

/**
 * Build the tenant-scoped `where` for the approval-case filters. Excludes cursor
 * pagination — the list handler adds that on top. `assignee: 'me'` only applies
 * when a concrete userId is supplied (dev-header/API-key callers have none).
 */
export function caseFilterWhere(
  tenantId: string,
  f: CaseFilterInput,
  userId?: string,
): Prisma.ApprovalCaseWhereInput {
  const createdAt = createdAtRange(f);
  return {
    tenantId,
    ...(f.status ? { status: f.status as never } : {}),
    ...(f.category ? { items: { some: { category: f.category as never } } } : {}),
    ...(f.urgency ? { urgency: f.urgency as never } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(f.assignee === 'me' && userId ? { assigneeUserId: userId } : {}),
  };
}
