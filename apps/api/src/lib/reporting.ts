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
