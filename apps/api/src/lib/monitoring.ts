/**
 * Error-monitoring seam (Block 9).
 *
 * A tiny abstraction so the codebase has ONE place to report unexpected errors
 * to an external monitor (Sentry, GlitchTip, …). The default is a no-op that
 * only logs, so nothing external is required to run or test. A real backend is
 * selected via `ERROR_MONITORING` + its credentials — `TODO PROVIDER SETUP`.
 *
 * This is intentionally transport-light (no SDK dependency): the real reporter
 * posts the event to an ingest URL. Until configured, `captureException` is a
 * safe no-op beyond structured logging in the caller.
 */
import { config } from '../config.js';

export interface ErrorContext {
  requestId?: string;
  tenantId?: string;
  route?: string;
  [key: string]: unknown;
}

export interface ErrorMonitor {
  readonly name: string;
  captureException(err: unknown, context?: ErrorContext): void;
}

/** Default: report nothing externally (the caller still logs). */
class NoopMonitor implements ErrorMonitor {
  readonly name = 'noop';
  captureException(): void {
    /* no external transport configured */
  }
}

/**
 * Placeholder for a real monitor. Only selected when a DSN is configured. Sends
 * a best-effort, fire-and-forget event to the ingest URL; failures are swallowed
 * so monitoring never breaks the request. TODO PROVIDER SETUP: wire the concrete
 * payload shape for the chosen backend.
 */
class HttpMonitor implements ErrorMonitor {
  readonly name = 'http';
  constructor(private readonly dsn: string) {}

  captureException(err: unknown, context?: ErrorContext): void {
    const payload = {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context,
      at: new Date().toISOString(),
    };
    // Fire-and-forget; never await, never throw.
    void fetch(this.dsn, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  }
}

/**
 * Decide the effective monitor. Pure enough to reason about: choosing a real
 * backend without a DSN degrades to noop (with a warning) rather than failing.
 */
export function resolveMonitorName(cfg = {
  provider: config.ERROR_MONITORING,
  hasDsn: !!config.ERROR_MONITORING_DSN,
}): 'noop' | 'http' {
  if (cfg.provider === 'none') return 'noop';
  if (!cfg.hasDsn) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  ERROR_MONITORING=${cfg.provider} but no DSN configured — monitoring disabled.`);
    return 'noop';
  }
  return 'http';
}

let cached: ErrorMonitor | null = null;

export function getMonitor(): ErrorMonitor {
  if (cached) return cached;
  cached = resolveMonitorName() === 'http' ? new HttpMonitor(config.ERROR_MONITORING_DSN!) : new NoopMonitor();
  return cached;
}

/** Convenience wrapper used by the error handler. */
export function captureException(err: unknown, context?: ErrorContext): void {
  getMonitor().captureException(err, context);
}
