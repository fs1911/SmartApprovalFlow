import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { getMe, can } from '@/lib/session';
import { StatusBadge, UrgencyBadge } from '@/app/_components/badges';
import { EmptyState } from '@/app/_components/empty-state';
import { OnboardingWidget, type OnboardingData } from './_onboarding-widget';

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
  const canSeeOnboarding = can(me, 'workspace:read');
  let cases: CaseRow[] = [];
  let onboarding: OnboardingData | null = null;
  let error: string | null = null;
  try {
    cases = await api.request<CaseRow[]>('/api/v1/approval-cases?limit=50');
    if (canSeeOnboarding) {
      onboarding = await api.request<OnboardingData>('/api/v1/onboarding');
    }
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  const count = (s: string) => cases.filter((c) => c.status === s).length;
  const pending = count('SENT') + count('VIEWED') + count('CALLBACK');
  const today = new Date().toISOString().slice(0, 10);
  const answeredToday = cases.filter(
    (c) => c.respondedAt && c.respondedAt.slice(0, 10) === today,
  ).length;
  // `status` links a card to the approvals list filtered to that status (Block
  // 38). "Wartet auf Kunde" aggregates SENT+VIEWED+CALLBACK and "Heute
  // beantwortet" is a responded-today count — neither maps to a single list
  // filter, so they stay plain (no `status`).
  const stats: { label: string; value: number; tone: string; status?: string }[] = [
    { label: 'Wartet auf Kunde', value: pending, tone: 'info' },
    { label: 'Heute beantwortet', value: answeredToday, tone: 'success' },
    { label: 'Freigegeben', value: count('APPROVED'), tone: 'success', status: 'APPROVED' },
    { label: 'Abgelehnt', value: count('DECLINED'), tone: 'danger', status: 'DECLINED' },
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

      {onboarding && <OnboardingWidget data={onboarding} />}

      <div className="row" style={{ marginBottom: 24 }}>
        {stats.map((s) => {
          const body = (
            <div className="card__body">
              <div className={`badge badge--${s.tone}`}>{s.label}</div>
              <div className="stat__value">{s.value}</div>
            </div>
          );
          return s.status ? (
            <Link
              key={s.label}
              href={`/approvals?status=${s.status}`}
              className={`card stat-card stat-card--${s.tone}`}
              style={{ flex: '1 1 160px', color: 'inherit', textDecoration: 'none' }}
              aria-label={`${s.value} ${s.label} in der Liste anzeigen`}
            >
              {body}
            </Link>
          ) : (
            <div
              key={s.label}
              className={`card stat-card stat-card--${s.tone}`}
              style={{ flex: '1 1 160px' }}
            >
              {body}
            </div>
          );
        })}
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
            <EmptyState
              variant="card"
              icon="📋"
              description="Noch keine Freigaben. Legen Sie Ihre erste digitale Kundenfreigabe an."
              action={
                canCreate ? (
                  <Link href="/approvals/new" className="btn btn--primary">
                    + Erste Freigabe erstellen
                  </Link>
                ) : undefined
              }
            />
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
