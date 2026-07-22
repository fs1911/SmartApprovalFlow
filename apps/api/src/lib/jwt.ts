/**
 * Session JWTs (HS256 via jose). Short-lived access tokens signed with
 * AUTH_JWT_SECRET. Kept minimal: the token carries who + which tenant; the role
 * is always re-resolved from the membership on each request (never trusted from
 * the token), so a role change takes effect immediately.
 */
import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';

const secret = new TextEncoder().encode(config.AUTH_JWT_SECRET);
const ISSUER = 'smart-approval-flow';

export interface SessionClaims {
  /** user id */
  sub: string;
  tenantId: string;
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ tenantId: claims.tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(config.AUTH_SESSION_TTL)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER });
    if (typeof payload.sub === 'string' && typeof payload.tenantId === 'string') {
      return { sub: payload.sub, tenantId: payload.tenantId };
    }
    return null;
  } catch {
    return null;
  }
}
