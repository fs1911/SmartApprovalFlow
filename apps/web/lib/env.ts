/**
 * Web environment validation (server-side).
 *
 * The API validates its env with Zod at boot (apps/api/src/config.ts). The web
 * app needs far less, so this is a lean, dependency-free equivalent: read the
 * handful of NEXT_PUBLIC_* values, apply defaults, and warn (not crash) on
 * anything malformed. Import `webEnv` instead of reading process.env directly.
 */
function readUrl(name: string, fallback: string): string {
  const raw = process.env[name];
  if (!raw) return fallback;
  try {
    // Validate it parses as a URL; keep the original string.
    new URL(raw);
    return raw;
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  ${name} is not a valid URL ("${raw}") — falling back to ${fallback}.`);
    return fallback;
  }
}

export const webEnv = {
  /** Base URL the web app uses to reach the API (server-side fetch). */
  apiBaseUrl: readUrl('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:4000'),
  /** Public site URL for canonical / OpenGraph / sitemap. */
  siteUrl: readUrl('NEXT_PUBLIC_SITE_URL', 'https://nicka.ch'),
  /** Dev-only role/tenant impersonation defaults (replaced by real auth later). */
  devTenant: process.env.SAF_DEV_TENANT ?? 'muster-garage',
  devRole: process.env.SAF_DEV_ROLE ?? 'OWNER',
};
