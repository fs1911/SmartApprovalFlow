/**
 * Release readiness smoke (Block 18).
 *
 * Hits the deployed API's liveness + readiness probes and exits non-zero if
 * either is unhealthy. Meant to run right after a production start (locally or
 * in CI), so it retries with a short backoff to ride out cold-start latency.
 *
 * Usage:
 *   tsx src/scripts/smoke.ts [baseUrl]
 *   SMOKE_BASE_URL=https://api.example npm run smoke --workspace @saf/api
 *
 * baseUrl defaults to $SMOKE_BASE_URL, then $API_BASE_URL, then localhost:4000.
 */
const baseUrl = (
  process.argv[2] ??
  process.env.SMOKE_BASE_URL ??
  process.env.API_BASE_URL ??
  'http://localhost:4000'
).replace(/\/$/, '');

const MAX_ATTEMPTS = Number(process.env.SMOKE_ATTEMPTS ?? 30);
const DELAY_MS = Number(process.env.SMOKE_DELAY_MS ?? 1000);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Envelope<T> {
  data?: T;
}

/** Fetch JSON, returning both the HTTP status and the parsed body (or null). */
async function getJson(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${baseUrl}${path}`, { headers: { accept: 'application/json' } });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function checkLiveness(): Promise<void> {
  const { status, body } = await getJson('/api/v1/health');
  const data = (body as Envelope<{ status?: string }>)?.data;
  if (status !== 200 || data?.status !== 'ok') {
    throw new Error(`liveness failed (HTTP ${status}, status=${data?.status ?? 'n/a'})`);
  }
}

async function checkReadiness(): Promise<{ latencyMs?: number }> {
  const { status, body } = await getJson('/api/v1/health/ready');
  const data = (body as Envelope<{ status?: string; checks?: { database?: { ok?: boolean; latencyMs?: number } } }>)
    ?.data;
  if (status !== 200 || data?.status !== 'ready' || !data?.checks?.database?.ok) {
    throw new Error(`readiness failed (HTTP ${status}, status=${data?.status ?? 'n/a'})`);
  }
  return { latencyMs: data.checks.database.latencyMs };
}

async function main(): Promise<void> {
  console.log(`🔎 Smoke-testing ${baseUrl} (up to ${MAX_ATTEMPTS} attempts)…`);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await checkLiveness();
      const { latencyMs } = await checkReadiness();
      console.log(`✅ Healthy: liveness ok, database reachable${latencyMs != null ? ` (${latencyMs}ms)` : ''}.`);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`   attempt ${attempt}/${MAX_ATTEMPTS} not ready yet, retrying…\r`);
        await sleep(DELAY_MS);
      }
    }
  }

  console.error(`\n❌ Smoke failed after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`);
  process.exit(1);
}

void main();
