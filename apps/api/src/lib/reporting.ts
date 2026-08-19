/**
 * Reporting & insights — pure, unit-tested metric helpers (Block 13).
 *
 * The route gathers rows from the DB and hands them to these functions; no I/O
 * here, so the aggregations are deterministic and fully testable. Revenue is a
 * *range* (min–max of the approved positions' price bands), never a single made-
 * up number.
 */

export type Granularity = 'day' | 'week';

// --- Basic stats -----------------------------------------------------------

export function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

/** Round to one decimal for display. */
export function round1(n: number | null): number | null {
  return n === null ? null : Math.round(n * 10) / 10;
}

// --- Period resolution -----------------------------------------------------

export interface Period {
  from: Date;
  to: Date;
  /** Preset label echoed back to the client (or 'custom'). */
  preset: string;
}

const PRESET_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };

/**
 * Resolve a period from a query. Explicit from/to win; otherwise a preset
 * (default 30d). Invalid dates fall back to the default. `to` is exclusive-ish
 * (end of "now").
 */
export function resolvePeriod(
  q: { period?: string; from?: string; to?: string },
  now: Date = new Date(),
): Period {
  if (q.from) {
    const from = new Date(q.from);
    const to = q.to ? new Date(q.to) : now;
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      return { from, to, preset: 'custom' };
    }
  }
  const preset = q.period && PRESET_DAYS[q.period] ? q.period : '30d';
  const days = PRESET_DAYS[preset]!;
  return { from: new Date(now.getTime() - days * 86_400_000), to: now, preset };
}

// --- Approval breakdown ----------------------------------------------------

export interface ApprovalBreakdown {
  approved: number;
  partiallyApproved: number;
  declined: number;
  callback: number;
  /** approved (+partial) as a share of *decided* cases, 0–100 or null. */
  approvalRate: number | null;
}

export function approvalBreakdown(statuses: string[]): ApprovalBreakdown {
  const c = (s: string) => statuses.filter((x) => x === s).length;
  const approved = c('APPROVED');
  const partiallyApproved = c('PARTIALLY_APPROVED');
  const declined = c('DECLINED');
  const callback = c('CALLBACK');
  const decided = approved + partiallyApproved + declined;
  return {
    approved,
    partiallyApproved,
    declined,
    callback,
    approvalRate: decided > 0 ? Math.round(((approved + partiallyApproved) / decided) * 100) : null,
  };
}

// --- Response rate (engagement) --------------------------------------------

/** Statuses where the request reached the customer, so a response was possible. */
const REACHED_STATUSES = [
  'SENT',
  'VIEWED',
  'CALLBACK',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'DECLINED',
  'EXPIRED',
] as const;
/** Statuses that represent an actual customer response (any action taken). */
const RESPONDED_STATUSES = ['APPROVED', 'PARTIALLY_APPROVED', 'DECLINED', 'CALLBACK'] as const;

export interface ResponseRate {
  /** Cases that were delivered to the customer (could have responded). */
  reached: number;
  /** Cases the customer acted on (approve/partial/decline/callback). */
  responded: number;
  /** responded as a share of reached, 0–100 or null when nothing was reached. */
  rate: number | null;
}

/**
 * Engagement funnel: of the cases that actually reached a customer, how many
 * got any response? Complements `approvalBreakdown` (which measures the *quality*
 * of decisions over decided cases): this measures whether customers engaged at
 * all. DRAFT (never sent) and CANCELLED (withdrawn) are excluded from both the
 * numerator and denominator; EXPIRED counts as reached-but-not-responded. A
 * CALLBACK counts as a response. Pure → unit-tested.
 */
export function responseRate(statuses: string[]): ResponseRate {
  const reached = statuses.filter((s) =>
    (REACHED_STATUSES as readonly string[]).includes(s),
  ).length;
  const responded = statuses.filter((s) =>
    (RESPONDED_STATUSES as readonly string[]).includes(s),
  ).length;
  return {
    reached,
    responded,
    rate: reached > 0 ? Math.round((responded / reached) * 100) : null,
  };
}

// --- Revenue from approved positions --------------------------------------

export interface RevenueCase {
  status: string;
  items: { decision: string | null; priceMinMinor: number | null; priceMaxMinor: number | null }[];
}
export interface RevenueRange {
  minMinor: number;
  maxMinor: number;
  /** Number of positions counted as approved. */
  approvedItems: number;
}

/**
 * Sum the price bands of positions that were approved:
 *  - a fully APPROVED case → all its positions,
 *  - a PARTIALLY_APPROVED case → only positions with decision === 'APPROVE',
 *  - anything else contributes nothing.
 */
export function revenueRange(cases: RevenueCase[]): RevenueRange {
  let minMinor = 0;
  let maxMinor = 0;
  let approvedItems = 0;
  for (const c of cases) {
    for (const it of c.items) {
      const itemApproved =
        c.status === 'APPROVED' || (c.status === 'PARTIALLY_APPROVED' && it.decision === 'APPROVE');
      if (!itemApproved) continue;
      approvedItems += 1;
      minMinor += it.priceMinMinor ?? 0;
      maxMinor += it.priceMaxMinor ?? 0;
    }
  }
  return { minMinor, maxMinor, approvedItems };
}

// --- Positions by category (Block 25) --------------------------------------

/** Canonical order for a stable, predictable category breakdown. */
const CATEGORY_ORDER = ['SAFETY', 'MAINTENANCE', 'REPAIR', 'DIAGNOSTIC', 'OTHER'] as const;

export interface CategoryItem {
  category?: string | null;
  priceMinMinor?: number | null;
  priceMaxMinor?: number | null;
}
export interface CategoryStat {
  category: string;
  count: number;
  /** Summed price band across the positions in this category. */
  minMinor: number;
  maxMinor: number;
}

/**
 * Count positions per category and sum their price bands. Returns only
 * categories that actually occur, in the canonical order above (unknown
 * categories fall back to OTHER). Pure → unit-tested.
 */
export function itemsByCategory(items: CategoryItem[]): CategoryStat[] {
  const acc = new Map<string, CategoryStat>();
  for (const it of items) {
    const key = (CATEGORY_ORDER as readonly string[]).includes(it.category ?? '')
      ? (it.category as string)
      : 'OTHER';
    const stat = acc.get(key) ?? { category: key, count: 0, minMinor: 0, maxMinor: 0 };
    stat.count += 1;
    stat.minMinor += it.priceMinMinor ?? 0;
    stat.maxMinor += it.priceMaxMinor ?? 0;
    acc.set(key, stat);
  }
  return CATEGORY_ORDER.filter((c) => acc.has(c)).map((c) => acc.get(c)!);
}

// --- Urgency distribution --------------------------------------------------

const URGENCY_ORDER = ['HIGH', 'MEDIUM', 'LOW'] as const;

export interface UrgencyCase {
  urgency?: string | null;
}
export interface UrgencyStat {
  urgency: string;
  count: number;
}

/**
 * Count cases per urgency, most urgent first. Returns only urgencies that
 * actually occur; unknown values fall back to MEDIUM. Pure → unit-tested.
 */
export function casesByUrgency(cases: UrgencyCase[]): UrgencyStat[] {
  const acc = new Map<string, UrgencyStat>();
  for (const c of cases) {
    const key = (URGENCY_ORDER as readonly string[]).includes(c.urgency ?? '')
      ? (c.urgency as string)
      : 'MEDIUM';
    const stat = acc.get(key) ?? { urgency: key, count: 0 };
    stat.count += 1;
    acc.set(key, stat);
  }
  return URGENCY_ORDER.filter((u) => acc.has(u)).map((u) => acc.get(u)!);
}

// --- Response-time distribution --------------------------------------------

export interface ResponseBucket {
  bucket: string;
  count: number;
}

/** Fixed histogram edges (in hours) for the response-time distribution. */
const RESPONSE_BUCKETS = [
  { bucket: 'under1h', max: 1 },
  { bucket: 'under1d', max: 24 },
  { bucket: 'under3d', max: 72 },
  { bucket: 'over3d', max: Infinity },
] as const;

/**
 * Bucket response times (hours from sent → responded) into a fixed 4-bin
 * histogram: <1h, 1–24h, 1–3d, >3d. Always returns all four bins in order
 * (count may be 0). Negative/NaN inputs are ignored. Pure → unit-tested.
 */
export function responseTimeBuckets(hours: number[]): ResponseBucket[] {
  const counts = RESPONSE_BUCKETS.map((b) => ({ bucket: b.bucket, count: 0 }));
  for (const h of hours) {
    if (!Number.isFinite(h) || h < 0) continue;
    const idx = RESPONSE_BUCKETS.findIndex((b) => h < b.max);
    counts[idx]!.count += 1;
  }
  return counts;
}

// --- Time-series bucketing -------------------------------------------------

export interface Bucket {
  start: Date;
  end: Date;
  label: string;
}

/** Build day or week buckets spanning [from, to]. Pure. */
export function makeBuckets(from: Date, to: Date, granularity: Granularity): Bucket[] {
  const stepMs = granularity === 'day' ? 86_400_000 : 7 * 86_400_000;
  const buckets: Bucket[] = [];
  // Normalise the start to midnight UTC for stable labels.
  let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let guard = 0;
  while (cursor.getTime() <= to.getTime() && guard < 400) {
    const end = new Date(cursor.getTime() + stepMs);
    buckets.push({ start: new Date(cursor), end, label: cursor.toISOString().slice(0, 10) });
    cursor = end;
    guard += 1;
  }
  return buckets;
}

/** Choose day granularity for short spans, week for long ones. */
export function pickGranularity(from: Date, to: Date): Granularity {
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  return days <= 31 ? 'day' : 'week';
}

/** Count dates into buckets. Returns one count per bucket, in order. */
export function countIntoBuckets(dates: Date[], buckets: Bucket[]): number[] {
  return buckets.map((b) => dates.filter((d) => d.getTime() >= b.start.getTime() && d.getTime() < b.end.getTime()).length);
}

// --- CSV -------------------------------------------------------------------

/** RFC-4180-ish escaping: wrap in quotes and double internal quotes if needed. */
export function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialise rows (array of arrays) to a CSV string with a header row. */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvEscape).join(','));
  return lines.join('\r\n') + '\r\n';
}
