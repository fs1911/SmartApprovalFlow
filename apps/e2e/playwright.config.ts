import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../..');

const CI = !!process.env.CI;
const API_PORT = 4000;
const WEB_PORT = 3000;

// In this managed container a matching Chromium is pre-installed; point
// Playwright at it via PW_CHROMIUM_BIN so we skip `playwright install`. In CI
// the browser is installed by the workflow and this stays unset.
const chromiumBin = process.env.PW_CHROMIUM_BIN;

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://saf:saf@localhost:5432/smart_approval_flow?schema=public';

// Env for the API under test. NODE_ENV=test keeps behaviour deterministic and
// uses console e-mail + local storage — no external accounts.
const apiEnv: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL,
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET ?? 'e2e-insecure-secret',
  EMAIL_PROVIDER: 'console',
  STORAGE_DRIVER: 'local',
};

export default defineConfig({
  testDir: './tests',
  // Seeds fresh cases + writes the token fixtures before any spec runs.
  globalSetup: './global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // The customer flow mutates case state, so keep it serial and single-worker.
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    ...(chromiumBin ? { launchOptions: { executablePath: chromiumBin } } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx tsx apps/api/src/server.ts',
      cwd: repoRoot,
      url: `http://localhost:${API_PORT}/api/v1/health`,
      reuseExistingServer: !CI,
      timeout: 60_000,
      env: apiEnv,
    },
    {
      command: 'npm run dev --workspace @saf/web',
      cwd: repoRoot,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !CI,
      timeout: 120_000,
      // Force development so `next dev` is happy even when the CI job sets
      // NODE_ENV=test at the job level. The customer page uses public routes,
      // so no dev-header auth is involved.
      env: { NODE_ENV: 'development', NEXT_PUBLIC_API_BASE_URL: `http://localhost:${API_PORT}` },
    },
  ],
});
