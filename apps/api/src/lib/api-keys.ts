/**
 * API keys for machine-to-machine integrations.
 *
 * Format: `saf_<env>_<prefix>_<secret>`. Only a SHA-256 hash is stored; the raw
 * key is shown exactly once at creation. Scopes are a space-delimited subset of
 * the shared Permission set — they map 1:1 onto the same RBAC checks used for
 * user sessions (see docs/api-design.md, adr-006).
 */
import { createHash, randomBytes } from 'node:crypto';
import { PERMISSIONS } from '@saf/types';
import type { Permission } from '@saf/types';

export interface GeneratedApiKey {
  /** Full secret, shown once. */
  raw: string;
  /** Non-secret identifier stored + shown in UI/logs, e.g. "saf_live_ab12cd". */
  prefix: string;
  keyHash: string;
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateApiKey(env: 'live' | 'test' = 'live'): GeneratedApiKey {
  const id = randomBytes(4).toString('hex'); // public prefix segment
  const secret = randomBytes(24).toString('base64url');
  const prefix = `saf_${env}_${id}`;
  const raw = `${prefix}_${secret}`;
  return { raw, prefix, keyHash: hashApiKey(raw) };
}

/** Validate + normalise a requested scope string against the Permission set. */
export function parseScopes(input: string): Permission[] {
  const wanted = input.trim().split(/\s+/).filter(Boolean);
  const valid = new Set<string>(PERMISSIONS);
  return wanted.filter((s): s is Permission => valid.has(s));
}

export function scopesToString(scopes: Permission[]): string {
  return Array.from(new Set(scopes)).join(' ');
}

/** Does an API key's scope string grant a permission? */
export function apiKeyHasPermission(scopeString: string, permission: Permission): boolean {
  return scopeString.trim().split(/\s+/).includes(permission);
}
