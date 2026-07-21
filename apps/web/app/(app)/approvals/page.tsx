import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { StatusBadge, UrgencyBadge } from '@/app/_components/badges';

interface CaseRow {
  id: string;
  reference: string;
  subject: string;
  status: string;
  urgency: string;
  createdAt: string;
  customer?: { name: string } | null;
  vehicle?: { plate?: string | null; make?: string | null; model?: string | null } | null;
  _count?: { items: number };
}

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  let cases: CaseRow[] = [];
  let error: string | null = null;
  try {
    cases = await api.request<CaseRow[]>('/api/v1/approval-cases?limit=100');
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Freigaben</h1>
          <p className="subtle">Alle Freigabeanfragen und ihr aktueller Status.</p>
        </div>
        <Link href="/approvals/new" className="btn btn--primary">
          + Neue Freigabe
        </Link>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 16 }}>
          {error} — läuft die API unter <code>{api.base}</code>?
        </div>
      )}

      {!error && cases.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">📋</div>
          <h2>Noch keine Freigaben</h2>
          <p className="subtle" style={{ maxWidth: 380, margin: '0 auto 20px' }}>
            Legen Sie Ihre erste Freigabeanfrage an. Der Kunde erhält einen sicheren Link und kann
            direkt freigeben, ablehnen oder einen Rückruf wünschen.
          </p>
          <Link href="/approvals/new" className="btn btn--primary">
            Erste Freigabe erstellen
          </Link>
        </div>
      ) : (
        <div className="case-list">
          {cases.map((c) => (
            <Link key={c.id} href={`/approvals/${c.id}`} className="case-row">
              <div>
                <div className="case-row__title">{c.subject}</div>
                <div className="case-row__meta">
                  {c.reference} · {c.customer?.name ?? 'Kunde'}
                  {c.vehicle?.plate ? ` · ${c.vehicle.plate}` : ''}
                  {c._count ? ` · ${c._count.items} Position(en)` : ''}
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
    </>
  );
}
