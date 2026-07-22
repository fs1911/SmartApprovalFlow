/**
 * Single-use verification tokens (Block 10) for member invitations and password
 * resets. Same security posture as the customer access links: a 256-bit random
 * token, only its SHA-256 hash stored, with expiry + one-shot consumption.
 */
import { createHash, randomBytes } from 'node:crypto';

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function issueVerificationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashVerificationToken(token) };
}

export function expiryFromHours(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export interface TokenState {
  expiresAt: Date;
  consumedAt?: Date | null;
  revokedAt?: Date | null;
}

/**
 * Pure validity check → unit-tested. A token is usable only if it hasn't
 * expired, hasn't been consumed and hasn't been revoked.
 */
export function isTokenValid(t: TokenState, now: Date = new Date()): boolean {
  if (t.consumedAt) return false;
  if (t.revokedAt) return false;
  return t.expiresAt.getTime() > now.getTime();
}
