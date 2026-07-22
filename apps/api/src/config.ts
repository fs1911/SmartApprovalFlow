/**
 * Environment configuration for the API, validated once at boot.
 * Fail fast with a clear message if something required is missing.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
  AUTH_JWT_SECRET: z.string().min(1).default('dev-insecure-secret-change-me'),
  DATABASE_URL: z.string().optional(),

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
