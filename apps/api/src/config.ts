/**
 * Environment configuration for the API, validated once at boot.
 * Fail fast with a clear message if something required is missing.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Optional explicit log level; otherwise derived from NODE_ENV.
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  API_PORT: z.coerce.number().int().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
  AUTH_JWT_SECRET: z.string().min(1).default('dev-insecure-secret-change-me'),
  // Access-token lifetime (jose duration string, e.g. "2h", "30m").
  AUTH_SESSION_TTL: z.string().default('12h'),
  // Onboarding token lifetimes (Block 10), in hours.
  INVITE_TTL_HOURS: z.coerce.number().int().default(168), // 7 days
  PASSWORD_RESET_TTL_HOURS: z.coerce.number().int().default(2),
  DATABASE_URL: z.string().optional(),

  // --- Rate limiting -------------------------------------------------------
  // Global default per IP per minute; stricter overrides apply to /public and
  // /auth/login at the route level.
  RATE_LIMIT_MAX: z.coerce.number().int().default(300),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  RATE_LIMIT_PUBLIC_MAX: z.coerce.number().int().default(30),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().default(10),

  // --- Webhooks ------------------------------------------------------------
  // Max delivery attempts before a webhook delivery is marked FAILED.
  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().default(5),

  // --- Reminder policy (Block 8) ------------------------------------------
  // Automatic reminders for cases still awaiting a customer response. The
  // policy is a pure function of these knobs; triggered via POST /reminders/run
  // (no cron dependency — see docs/reminders.md).
  REMINDER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  // Hours after "sent" before the first reminder goes out.
  REMINDER_FIRST_AFTER_HOURS: z.coerce.number().default(24),
  // Hours between subsequent reminders.
  REMINDER_REPEAT_EVERY_HOURS: z.coerce.number().default(48),
  // Hard cap on the number of reminders per case.
  REMINDER_MAX: z.coerce.number().int().default(3),

  // --- Attachments (Block 8) ----------------------------------------------
  // Server-side guard rails re-checked when the bytes actually arrive.
  ATTACHMENT_MAX_BYTES: z.coerce.number().int().default(15 * 1024 * 1024),

  // --- Observability (Block 9) --------------------------------------------
  // Error monitoring: `none` (default, no-op) or an HTTP ingest backend chosen
  // via a DSN. Without a DSN the code degrades to no-op. TODO PROVIDER SETUP.
  ERROR_MONITORING: z.enum(['none', 'sentry', 'http']).default('none'),
  ERROR_MONITORING_DSN: z.string().optional(),

  // --- Billing (Block 11) -------------------------------------------------
  // `mock` (default) applies plan changes immediately with no external account.
  // `stripe` is the real adapter, activated once its keys are present; without
  // them the resolver falls back to `mock`. TODO PROVIDER SETUP.
  BILLING_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
  STRIPE_SECRET_KEY: z.string().optional(),
  // Shared secret used to verify inbound billing webhooks (HMAC in dev/mock).
  BILLING_WEBHOOK_SECRET: z.string().default('whsec_dev_billing'),

  // --- Retention / cleanup (Block 9) --------------------------------------
  // Per-tenant cleanup thresholds, triggered via POST /maintenance/cleanup.
  // Idempotency uses each record's own expiresAt; these bound the rest.
  RETENTION_WEBHOOK_DAYS: z.coerce.number().int().default(30),
  RETENTION_ORPHAN_ATTACHMENT_HOURS: z.coerce.number().int().default(24),
  // Erase terminal (closed) cases older than N months. 0 = disabled (default),
  // so nothing is auto-deleted unless a workspace opts in. See docs/data-lifecycle.md.
  RETENTION_CASE_MONTHS: z.coerce.number().int().default(0),

  // --- Notifications -------------------------------------------------------
  // `console` (default) logs messages and needs no credentials. `resend` sends
  // real e-mail, but only when RESEND_API_KEY is present — otherwise the code
  // falls back to console (never a silent no-op, never a crash).
  EMAIL_PROVIDER: z.enum(['console', 'resend', 'smtp']).default('console'),
  EMAIL_FROM: z.string().default('freigabe@example-garage.ch'),
  RESEND_API_KEY: z.string().optional(),

  // --- Storage (attachments) ----------------------------------------------
  // `local` (default) writes to the filesystem and works with no credentials.
  // `supabase` / `r2` are real drivers, activated once their env is set.
  STORAGE_DRIVER: z.enum(['local', 'supabase', 'r2']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./.uploads'),
  // Cloud storage (optional; only read by the matching driver).
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('attachments'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('attachments'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid API environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export const isProd = config.NODE_ENV === 'production';
