import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ITEM_CATEGORY_LABELS } from '@saf/types';
import { ITEM_CATEGORY_PRESENTATION } from '@saf/ui';
import { api, ApiClientError } from '@/lib/api';
import { getMe, can } from '@/lib/session';

interface Summary {
  period: { from: string; to: string; preset: string; granularity: string };
  totals: {
    all: number;
    draft: number;
    sent: number;
    pending: number;
    approved: number;
    partiallyApproved: number;
    declined: number;
    callback: number;
    expired: number;
    cancelled: number;
  };
  approvalRate: number | null;
  responseHours: { avg: number | null; median: number | null; count: number };
  revenue: { minMinor: number; maxMinor: number; approvedItems: number; display: string };
  categories: { category: string; count: number; display: string }[];
  trend: { granularity: string; buckets: { label: string; created: number; sent: number }[] };
}

export const dynamic = 'force-dynamic';

const PRESETS: { key: string; label: string }[] = [
  { key: '7d', label: '7 Tage' },
  { key: '30d', label: '30 Tage' },
  { key: '90d', label: '90 Tage' },
  { key: '365d', label: '1 Jahr' },
];

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card" style={{ flex: '1 1 180px' }}>
      <div className="card__body">
        <div className="subtle">{label}</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: 6 }}>{value}</div>
        {hint && <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>{hint}</div>}
      </div>
    </div>
  );
}

/** Lightweight inline bar chart — no chart library. */
function Trend({ buckets }: { buckets: Summary['trend']['buckets'] }) {
  const max = Math.max(1, ...buckets.map((b) => b.created));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, overflowX: 'auto' }}>
      {buckets.map((b, i) => (
        <div
          key={i}
          title={`${b.label}: ${b.created} erstellt, ${b.sent} gesendet`}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 14 }}
        >
          <div
            aria-hidden
            style={{
              width: 12,
              height: `${Math.round((b.created / max) * 100)}%`,
              minHeight: b.created > 0 ? 3 : 0,
              background: 'var(--color-brand-500)',
              borderRadius: '2px 2px 0 0',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const me = await getMe();
  if (!can(me, 'reporting:read')) redirect('/dashboard');

  const preset = PRESETS.some((p) => p.key === searchParams.period) ? searchParams.period! : '30d';

  let s: Summary | null = null;
  let error: string | null = null;
  try {
    s = await api.request<Summary>(`/api/v1/reporting/summary?period=${preset}`);
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Auswertung</h1>
          <p className="subtle">Kennzahlen, Umsatz und Trends für Ihren Workspace.</p>
        </div>
        <a className="btn btn--secondary" href={`/reporting/export?period=${preset}`}>
          ⬇ CSV-Export
        </a>
      </div>

      {/* Period filter */}
      <div className="row" style={{ gap: 6, marginBottom: 16 }} role="group" aria-label="Zeitraum">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/reporting?period=${p.key}`}
            className={`btn ${p.key === preset ? 'btn--primary' : 'btn--ghost'}`}
            aria-current={p.key === preset ? 'true' : undefined}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      {s && (
        <>
          <div className="row" style={{ marginBottom: 16 }}>
            <Kpi label="Freigabequote" value={s.approvalRate != null ? `${s.approvalRate}%` : '—'} hint="freigegeben von entschieden" />
            <Kpi
              label="Umsatz (freigegeben)"
              value={s.revenue.approvedItems > 0 ? s.revenue.display : '—'}
              hint={`${s.revenue.approvedItems} Position(en)`}
            />
            <Kpi
              label="Reaktionszeit (Median)"
              value={s.responseHours.median != null ? `${s.responseHours.median} h` : '—'}
              hint={s.responseHours.avg != null ? `Ø ${s.responseHours.avg} h` : 'Senden bis Entscheid'}
            />
            <Kpi label="Wartet auf Kunde" value={String(s.totals.pending)} />
            <Kpi label="Gesendet" value={String(s.totals.sent)} hint="im Zeitraum" />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__body">
              <h2>Trend — erstellte Fälle ({s.trend.granularity === 'day' ? 'täglich' : 'wöchentlich'})</h2>
              {s.trend.buckets.length > 0 ? (
                <Trend buckets={s.trend.buckets} />
              ) : (
                <p className="subtle">Keine Daten im gewählten Zeitraum.</p>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__body">
              <h2>Positionen nach Kategorie ({PRESETS.find((p) => p.key === preset)?.label})</h2>
              {s.categories.length > 0 ? (
                <div className="stack">
                  {(() => {
                    const max = Math.max(1, ...s.categories.map((c) => c.count));
                    return s.categories.map((c) => {
                      const label =
                        ITEM_CATEGORY_LABELS[c.category as keyof typeof ITEM_CATEGORY_LABELS] ??
                        c.category;
                      const tone = ITEM_CATEGORY_PRESENTATION[c.category]?.tone ?? 'neutral';
                      return (
                        <div key={c.category}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              marginBottom: 4,
                            }}
                          >
                            <span>
                              <span className={`badge badge--${tone}`}>{label}</span>{' '}
                              <span className="subtle">· {c.display}</span>
                            </span>
                            <strong>{c.count}</strong>
                          </div>
                          <div
                            aria-hidden
                            style={{
                              height: 8,
                              borderRadius: 4,
                              background: 'var(--color-surface-subtle)',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round((c.count / max) * 100)}%`,
                                height: '100%',
                                borderRadius: 4,
                                background: 'var(--color-brand-500)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="subtle">Keine Positionen im gewählten Zeitraum.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__body">
              <h2>Fälle nach Status ({PRESETS.find((p) => p.key === preset)?.label})</h2>
              <dl className="dl">
                <dt>Gesamt</dt>
                <dd>{s.totals.all}</dd>
                <dt>Entwurf</dt>
                <dd>{s.totals.draft}</dd>
                <dt>Wartet auf Kunde</dt>
                <dd>{s.totals.pending}</dd>
                <dt>Freigegeben</dt>
                <dd>{s.totals.approved}</dd>
                <dt>Teilweise freigegeben</dt>
                <dd>{s.totals.partiallyApproved}</dd>
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
