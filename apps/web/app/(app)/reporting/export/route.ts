/**
 * CSV download proxy (Block 13).
 *
 * The API needs the session bearer (or dev headers), but the web app's session
 * cookie is httpOnly and same-origin only. This same-origin route reads the
 * cookie server-side, calls the API, and streams the CSV back so the browser can
 * download it directly.
 */
import { cookies } from 'next/headers';
import { webEnv } from '@/lib/env';
import { SESSION_COOKIE, ROLE_COOKIE } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const qs = new URL(req.url).searchParams.toString();
  const jar = cookies();
  const session = jar.get(SESSION_COOKIE)?.value;

  const headers: Record<string, string> = {};
  if (session) {
    headers.authorization = `Bearer ${session}`;
  } else if (process.env.NODE_ENV !== 'production') {
    headers['x-saf-tenant'] = webEnv.devTenant;
    headers['x-saf-role'] = jar.get(ROLE_COOKIE)?.value ?? webEnv.devRole;
  }

  const upstream = await fetch(`${webEnv.apiBaseUrl}/api/v1/reporting/export.csv?${qs}`, {
    headers,
    cache: 'no-store',
  });
  const body = await upstream.text();

  if (!upstream.ok) {
    return new Response('Export nicht verfügbar.', { status: upstream.status });
  }
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': upstream.headers.get('content-disposition') ?? 'attachment; filename="saf-report.csv"',
    },
  });
}
