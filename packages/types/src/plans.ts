/**
 * Plans & limits (Block 11) — shared so API (enforcement) and web (display)
 * agree on the exact same numbers. `null` means "unlimited".
 */

export const PLAN_KEYS = ['FREE', 'STARTER', 'PRO'] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const SUBSCRIPTION_STATUS = ['ACTIVE', 'PAST_DUE', 'CANCELLED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

export interface PlanLimits {
  /** Approval cases that may be *sent* per calendar month. null = unlimited. */
  casesPerMonth: number | null;
  /** Workspace members (seats), including pending invitations. null = unlimited. */
  seats: number | null;
}

export interface PlanDefinition {
  key: PlanKey;
  label: string;
  /** Indicative monthly price in minor units (CHF Rappen); UI/marketing only. */
  priceMinor: number;
  limits: PlanLimits;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  FREE: {
    key: 'FREE',
    label: 'Free',
    priceMinor: 0,
    limits: { casesPerMonth: 10, seats: 2 },
  },
  STARTER: {
    key: 'STARTER',
    label: 'Starter',
    priceMinor: 4900,
    limits: { casesPerMonth: 100, seats: 5 },
  },
  PRO: {
    key: 'PRO',
    label: 'Pro',
    priceMinor: 14900,
    limits: { casesPerMonth: null, seats: null },
  },
};

/** Default plan for a new/seeded workspace. */
export const DEFAULT_PLAN: PlanKey = 'PRO';

/** Fraction of a hard limit at which we start warning (soft threshold). */
export const SOFT_LIMIT_RATIO = 0.8;

export interface LimitStatus {
  limit: number | null;
  used: number;
  remaining: number | null;
  /** false → the action must be blocked (hard limit reached). */
  withinLimit: boolean;
  /** true → show a gentle "approaching your limit" hint (not a block). */
  softWarning: boolean;
}

/**
 * Pure limit evaluation → unit-tested. `null` limit is always within limit and
 * never warns. At/over the limit → withinLimit=false. At/over the soft ratio (but
 * still under the hard limit) → softWarning=true.
 */
export function evaluateLimit(used: number, limit: number | null): LimitStatus {
  if (limit === null) {
    return { limit: null, used, remaining: null, withinLimit: true, softWarning: false };
  }
  const remaining = Math.max(0, limit - used);
  const withinLimit = used < limit;
  const softWarning = withinLimit && used >= Math.floor(limit * SOFT_LIMIT_RATIO);
  return { limit, used, remaining, withinLimit, softWarning };
}
