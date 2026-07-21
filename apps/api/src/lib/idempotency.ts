/**
 * Idempotency for unsafe writes (see docs/api-design.md).
 *
 * Clients send `Idempotency-Key: <uuid>` on POSTs that must not double-apply
 * (e.g. creating an approval case, or a customer submitting a decision twice
 * from a flaky mobile connection). We remember the first response for a key and
 * replay it on retry.
 *
 * Block 1 uses an in-memory TTL map — correct for a single instance and enough
 * to exercise the contract. Block 5 swaps this for a Postgres/Redis-backed
 * store keyed by (tenantId, key) so it survives restarts and scales out.
 */
interface StoredResponse {
  statusCode: number;
  body: unknown;
  /** Hash of the request payload, to detect key reuse with a different body. */
  fingerprint: string;
  expiresAt: number;
}

const store = new Map<string, StoredResponse>();
const TTL_MS = 24 * 60 * 60 * 1000;

export function getIdempotent(key: string): StoredResponse | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit;
}

export function saveIdempotent(
  key: string,
  statusCode: number,
  body: unknown,
  fingerprint: string,
): void {
  store.set(key, { statusCode, body, fingerprint, expiresAt: Date.now() + TTL_MS });
}
