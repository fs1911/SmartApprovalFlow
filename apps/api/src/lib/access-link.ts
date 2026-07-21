/**
 * Secure, loginless customer access tokens.
 *
 * Design (see docs/api-design.md, "Public approval links"):
 *  - The raw token is a 256-bit URL-safe random string, shown once and put
 *    into the link {WEB_BASE_URL}/a/{token}.
 *  - Only the SHA-256 hash is stored (tokenHash) — a DB leak does not expose
 *    working links.
 *  - Links carry an optional expiresAt; expired/revoked links are rejected.
 */
import { createHash, randomBytes } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function issueAccessToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

/** Default validity window for a newly generated link. */
export function defaultLinkExpiry(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 14); // 14 days is a sensible approval window
  return d;
}
