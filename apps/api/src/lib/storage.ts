/**
 * Storage abstraction for attachments (photos are central to the product).
 *
 * Block 6 delivers the *seam*, not a production upload pipeline: a driver
 * interface with a working `local` dev driver and cloud placeholders
 * (`supabase`, `r2`) that activate once their credentials are configured.
 * The Attachment model already stores a `storageKey`; the driver turns that key
 * into signed upload/download URLs. See docs/storage-strategy.md.
 *
 * Everything here runs with NO external credentials in `local` mode.
 */
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { config } from '../config.js';

export interface SignedUpload {
  /** Where the client PUTs the bytes. */
  url: string;
  method: 'PUT' | 'POST';
  headers?: Record<string, string>;
  /** The storage key to persist on the Attachment row. */
  key: string;
  expiresAt: string;
}

export interface StorageDriver {
  readonly name: string;
  /** Server-side write (e.g. seed/tests). */
  put(key: string, data: Buffer, contentType: string): Promise<{ key: string }>;
  /** Pre-signed URL for a direct client upload. */
  getSignedUploadUrl(key: string, contentType: string): Promise<SignedUpload>;
  /** Pre-signed (or dev) URL to read the object back. */
  getSignedDownloadUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

/** Local filesystem driver — the default; needs no credentials. */
class LocalStorageDriver implements StorageDriver {
  readonly name = 'local';
  private readonly root = resolve(process.cwd(), config.STORAGE_LOCAL_DIR);

  private pathFor(key: string): string {
    // Prevent path traversal out of the storage root.
    const safe = key.replace(/\.\.+/g, '.').replace(/^\/+/, '');
    return join(this.root, safe);
  }

  async put(key: string, data: Buffer): Promise<{ key: string }> {
    const p = this.pathFor(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
    return { key };
  }

  async getSignedUploadUrl(key: string): Promise<SignedUpload> {
    // In dev there is no external upload host. Block 8 (attachments UI) adds an
    // API upload endpoint that the local driver serves; the shape is stable.
    return {
      url: `${config.API_BASE_URL}/api/v1/uploads/local/${encodeURIComponent(key)}`,
      method: 'PUT',
      key,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  async getSignedDownloadUrl(key: string): Promise<string> {
    return `${config.API_BASE_URL}/api/v1/uploads/local/${encodeURIComponent(key)}`;
  }

  /** Local-only helper used by a future upload endpoint. */
  async read(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.pathFor(key)).catch(() => undefined);
  }
}

/**
 * Placeholder for a cloud driver (Supabase Storage or Cloudflare R2). It is
 * only selected when the chosen driver's credentials are present; otherwise the
 * resolver falls back to `local`. Until the real client is wired up, every
 * method fails loudly rather than pretending to work. TODO PROVIDER SETUP.
 */
class UnconfiguredCloudDriver implements StorageDriver {
  constructor(public readonly name: string) {}
  private fail(): never {
    throw new Error(
      `Storage driver "${this.name}" is selected but not yet implemented/configured (TODO PROVIDER SETUP).`,
    );
  }
  async put(): Promise<{ key: string }> {
    this.fail();
  }
  async getSignedUploadUrl(): Promise<SignedUpload> {
    this.fail();
  }
  async getSignedDownloadUrl(): Promise<string> {
    this.fail();
  }
  async delete(): Promise<void> {
    this.fail();
  }
}

/**
 * Decide the effective driver. Selecting a cloud driver without its credentials
 * degrades to `local` (with a warning) so a misconfigured env never crashes the
 * whole API at boot. Pure function → unit-testable.
 */
export function resolveStorageDriverName(cfg = {
  driver: config.STORAGE_DRIVER,
  hasSupabase: !!(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY),
  hasR2: !!(config.R2_ACCOUNT_ID && config.R2_ACCESS_KEY_ID && config.R2_SECRET_ACCESS_KEY),
}): 'local' | 'supabase' | 'r2' {
  if (cfg.driver === 'supabase') return cfg.hasSupabase ? 'supabase' : warnLocal('supabase');
  if (cfg.driver === 'r2') return cfg.hasR2 ? 'r2' : warnLocal('r2');
  return 'local';
}

function warnLocal(wanted: string): 'local' {
  // eslint-disable-next-line no-console
  console.warn(`⚠️  STORAGE_DRIVER=${wanted} but its credentials are missing — using local storage.`);
  return 'local';
}

let cached: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (cached) return cached;
  const name = resolveStorageDriverName();
  cached = name === 'local' ? new LocalStorageDriver() : new UnconfiguredCloudDriver(name);
  return cached;
}
