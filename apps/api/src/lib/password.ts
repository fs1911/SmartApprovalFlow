/**
 * Password hashing with Node's built-in scrypt.
 *
 * Chosen over argon2/bcrypt to avoid a native build dependency (works in any
 * environment out of the box). scrypt is a memory-hard KDF and a solid default;
 * argon2id remains an option later behind the same interface.
 *
 * Stored format: `scrypt$<saltHex>$<hashHex>`.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1]!, 'hex');
  const expected = Buffer.from(parts[2]!, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  // Constant-time comparison; guard against length mismatch.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
