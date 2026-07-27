/**
 * Case JSON export download (Block 15). Same-origin proxy so the httpOnly
 * session reaches the API; returns the case export as a downloadable file.
 */
import { cookies } from 'next/headers';
import { webEnv } from '@/lib/env';
import { SESSION_COOKIE, ROLE_COOKIE } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const jar = cookies();
  const session = jar.get(SESSION_COOKIE)?.value;
  const headers: Record<string, string> = {};
  if (session) {
    headers.authorization = `Bearer ${session}`;
  } else if (process.env.NODE_ENV !== 'production') {
    headers['x-saf-tenant'] = webEnv.devTenant;
    headers['x-saf-role'] = jar.get(ROLE_COOKIE)?.value ?? webEnv.devRole;
  }

  const upstream = await fetch(`${webEnv.apiBaseUrl}/api/v1/approval-cases/${params.id}/export`, {
    headers,
    cache: 'no-store',
  });
  if (!upstream.ok) return new Response('Export nicht verfügbar.', { status: upstream.status });

  // Unwrap the { data } envelope so the file is the export object itself.
  const json = (await upstream.json()) as { data?: unknown };
  const body = JSON.stringify(json.data ?? json, null, 2);
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="case-${params.id}.json"`,
    },
  });
}
