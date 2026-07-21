import { redirect } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api';
import { getMe, can } from '@/lib/session';

interface Summary {
  totals: {
    all: number;
    draft: number;
    pending: number;
    approved: number;
    declined: number;
    callback: number;
    expired: number;
    cancelled: number;
  };
  approvalRate: number | null;
  avgResponseHours: number | null;
  last7Days: { sent: number };
  answeredToday: number;
}

export const dynamic = 'force-dynamic';

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card" style={{ flex: '1 1 200px' }}>
      <div className="card__body">
        <div className="subtle">{label}</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 6 }}>{value}</div>
        {hint && <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>{hint}</div>}
      </div>
    </div>
  );
}

export default async function ReportingPage() {
  const me = await getMe();
  if (!can(me, 'reporting:read')) redirect('/dashboard');

  let s: Summary | null = null;
  let error: string | null = null;
  try {
    s = await api.request<Summary>('/api/v1/reporting/summary');
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Auswertung</h1>
          <p className="subtle">Operative Kennzahlen für Ihren Workspace.</p>
        </div>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      {s && (
        <>
          <div className="row" style={{ marginBottom: 16 }}>
            <Kpi label="Freigabequote" value={s.approvalRate != null ? `${s.approvalRate}%` : '—'} hint="freigegeben von entschieden" />
            <Kpi
              label="Ø Reaktionszeit"
              value={s.avgResponseHours != null ? `${s.avgResponseHours} h` : '—'}
              hint="Senden bis Entscheid"
            />
            <Kpi label="Wartet auf Kunde" value={String(s.totals.pending)} />
            <Kpi label="Gesendet (7 Tage)" value={String(s.last7Days.sent)} />
            <Kpi label="Heute beantwortet" value={String(s.answeredToday)} />
          </div>

          <div className="card">
            <div className="card__body">
              <h2>Fälle nach Status</h2>
              <dl className="dl">
                <dt>Gesamt</dt>
                <dd>{s.totals.all}</dd>
                <dt>Entwurf</dt>
                <dd>{s.totals.draft}</dd>
                <dt>Wartet auf Kunde</dt>
                <dd>{s.totals.pending}</dd>
                <dt>Freigegeben</dt>
                <dd>{s.totals.approved}</dd>
                <dt>Abgelehnt</dt>
                <dd>{s.totals.declined}</dd>
                <dt>Rückruf</dt>
                <dd>{s.totals.callback}</dd>
                <dt>Abgelaufen</dt>
                <dd>{s.totals.expired}</dd>
                <dt>Storniert</dt>
                <dd>{s.totals.cancelled}</dd>
              </dl>
            </div>
          </div>
        </>
      )}
    </>
  );
}
