/**
 * Billing provider abstraction (Block 11).
 *
 * Same shape as the storage/notification/monitoring seams: a `mock` driver that
 * runs the whole flow locally with no external account (plan changes apply
 * immediately), and a `stripe` placeholder that activates only once its keys are
 * present — otherwise the resolver falls back to `mock`. TODO PROVIDER SETUP.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PlanKey } from '@saf/types';
import { config } from '../config.js';

export interface CheckoutSession {
  /** Where to send the user to complete the change. */
  url: string;
  /** True when the change already took effect (mock) and no redirect is needed. */
  applied: boolean;
}

export interface BillingProvider {
  readonly name: string;
  /**
   * Begin a plan change. The mock applies it immediately (applied=true); a real
   * provider returns a hosted checkout URL and waits for a webhook.
   */
  startPlanChange(tenantId: string, planKey: PlanKey): Promise<CheckoutSession>;
  /** A link to manage billing (mock returns the in-app settings page). */
  billingPortalUrl(tenantId: string): Promise<string>;
}

class MockBillingProvider implements BillingProvider {
  readonly name = 'mock';
  async startPlanChange(): Promise<CheckoutSession> {
    // No external hop: the route applies the change directly.
    return { url: `${config.WEB_BASE_URL}/settings`, applied: true };
  }
  async billingPortalUrl(): Promise<string> {
    return `${config.WEB_BASE_URL}/settings`;
  }
}

/**
 * Placeholder for Stripe. Selected only when STRIPE_SECRET_KEY is present; until
 * the real client is wired up it fails loudly rather than pretending to work.
 * TODO PROVIDER SETUP: create Checkout/Billing-Portal sessions via the Stripe API.
 */
class UnconfiguredStripeProvider implements BillingProvider {
  readonly name = 'stripe';
  private fail(): never {
    throw new Error('Stripe billing is selected but not yet implemented (TODO PROVIDER SETUP).');
  }
  async startPlanChange(): Promise<CheckoutSession> {
    this.fail();
  }
  async billingPortalUrl(): Promise<string> {
    this.fail();
  }
}

/**
 * Decide the effective provider. Choosing `stripe` without a key degrades to
 * `mock` (with a warning). Pure → unit-testable.
 */
export function resolveBillingProviderName(cfg = {
  provider: config.BILLING_PROVIDER,
  hasStripeKey: !!config.STRIPE_SECRET_KEY,
}): 'mock' | 'stripe' {
  if (cfg.provider === 'stripe') {
    if (cfg.hasStripeKey) return 'stripe';
    // eslint-disable-next-line no-console
    console.warn('⚠️  BILLING_PROVIDER=stripe but STRIPE_SECRET_KEY is missing — using mock billing.');
    return 'mock';
  }
  return 'mock';
}

let cached: BillingProvider | null = null;
export function getBillingProvider(): BillingProvider {
  if (cached) return cached;
  cached = resolveBillingProviderName() === 'stripe' ? new UnconfiguredStripeProvider() : new MockBillingProvider();
  return cached;
}

/** Sign a webhook payload (dev/mock: HMAC-SHA256, hex, `sha256=` prefixed). */
export function signBillingPayload(secret: string, payload: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

/** Constant-time verification of a billing webhook signature. */
export function verifyBillingSignature(secret: string, payload: string, signature: string): boolean {
  const expected = signBillingPayload(secret, payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature ?? '');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
