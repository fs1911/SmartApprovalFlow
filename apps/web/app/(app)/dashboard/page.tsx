import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { getMe, can } from '@/lib/session';
import { StatusBadge, UrgencyBadge } from '@/app/_components/badges';

interface CaseRow {
  id: string;
  reference: string;
  subject: string;
  status: string;
  urgency: string;
  createdAt: string;
  respondedAt?: string | null;
  customer?: { name: string } | null;
  vehicle?: { plate?: string | null } | null;
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const me = await getMe();
  const canCreate = can(me, 'cases:create');
  let cases: CaseRow[] = [];
  let error: string | null = null;
  try {
    cases = await api.request<CaseRow[]>('/api/v1/approval-cases?limit=50');
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  const count = (s: string) => cases.filter((c) => c.status === s).length;
  const pending = count('SENT') + count('VIEWED') + count('CALLBACK');
  const today = new Date().toISOString().slice(0, 10);
  const answeredToday = cases.filter(
    (c) => c.respondedAt && c.respondedAt.slice(0, 10) === today,
  ).length;
  const stats = [
    { label: 'Wartet auf Kunde', value: pending, tone: 'info' },
    { label: 'Heute beantwortet', value: answeredToday, tone: 'success' },
    { label: 'Freigegeben', value: count('APPROVED'), tone: 'success' },
    { label: 'Abgelehnt', value: count('DECLINED'), tone: 'danger' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Übersicht</h1>
          <p className="subtle">Ihre digitalen Freigaben auf einen Blick.</p>
        </div>
        {canCreate && (
          <Link href="/approvals/new" className="btn btn--primary">
            + Neue Freigabe
          </Link>
        )}
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 16 }}>
          {error} — läuft die API unter <code>{api.base}</code>?
        </div>
      )}

      <div className="row" style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ flex: '1 1 160px' }}>
            <div className="card__body">
              <div className={`badge badge--${s.tone}`}>{s.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card__body">
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <h2 style={{ margin: 0 }}>Neueste Freigaben</h2>
            <Link href="/approvals">Alle ansehen →</Link>
          </div>
          {cases.length === 0 ? (
            <p className="subtle" style={{ marginTop: 12 }}>
              Noch keine Freigaben vorhanden.
            </p>
          ) : (
            <div className="case-list" style={{ marginTop: 16 }}>
              {cases.slice(0, 6).map((c) => (
                <Link key={c.id} href={`/approvals/${c.id}`} className="case-row">
                  <div>
                    <div className="case-row__title">{c.subject}</div>
                    <div className="case-row__meta">
                      {c.reference} · {c.customer?.name ?? 'Kunde'}{' '}
                      {c.vehicle?.plate ? `· ${c.vehicle.plate}` : ''}
                    </div>
                  </div>
                  <div className="case-row__right">
                    <UrgencyBadge urgency={c.urgency} />
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
