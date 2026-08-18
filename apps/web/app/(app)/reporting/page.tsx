import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ITEM_CATEGORY_LABELS } from '@saf/types';
import { ITEM_CATEGORY_PRESENTATION, URGENCY_PRESENTATION } from '@saf/ui';
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
  urgencies: { urgency: string; count: number }[];
  trend: { granularity: string; buckets: { label: string; created: number; sent: number }[] };
}

export const dynamic = 'force-dynamic';

const PRESETS: { key: string; label: string }[] = [
  { key: '7d', label: '7 Tage' },
  { key: '30d', label: '30 Tage' },
  { key: '90d', label: '90 Tage' },
  { key: '365d', label: '1 Jahr' },
];

/**
 * Link from a reporting metric to the approvals list filtered the same way
 * (Block 37). The reporting period maps 1:1 to the list's `createdWithin` window,
 * so the filtered list roughly reflects the metric. Status/category are the
 * list's own filter keys; `pending` is an aggregate with no single-status filter,
 * so its rows stay plain text.
 */
function listHref(
  preset: string,
  opts: { status?: string; category?: string; urgency?: string } = {},
): string {
  const sp = new URLSearchParams();
  sp.set('createdWithin', preset);
  if (opts.status) sp.set('status', opts.status);
  if (opts.category) sp.set('category', opts.category);
  if (opts.urgency) sp.set('urgency', opts.urgency);
  return `/approvals?${sp.toString()}`;
}

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
                        <Link
                          key={c.category}
                          href={listHref(preset, { category: c.category })}
                          aria-label={`${c.count} Fälle der Kategorie ${label} in der Liste anzeigen`}
                          style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
                        >
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
                        </Link>
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="subtle">Keine Positionen im gewählten Zeitraum.</p>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__body">
              <h2>Fälle nach Dringlichkeit ({PRESETS.find((p) => p.key === preset)?.label})</h2>
              {s.urgencies.length > 0 ? (
                <div className="stack">
                  {(() => {
                    const max = Math.max(1, ...s.urgencies.map((u) => u.count));
                    return s.urgencies.map((u) => {
                      const label = URGENCY_PRESENTATION[u.urgency]?.label ?? u.urgency;
                      const tone = URGENCY_PRESENTATION[u.urgency]?.tone ?? 'neutral';
                      return (
                        <Link
                          key={u.urgency}
                          href={listHref(preset, { urgency: u.urgency })}
                          aria-label={`${u.count} Fälle der Dringlichkeit ${label} in der Liste anzeigen`}
                          style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              marginBottom: 4,
                            }}
                          >
                            <span className={`badge badge--${tone}`}>{label}</span>
                            <strong>{u.count}</strong>
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
                                width: `${Math.round((u.count / max) * 100)}%`,
                                height: '100%',
                                borderRadius: 4,
                                background: 'var(--color-brand-500)',
                              }}
                            />
                          </div>
                        </Link>
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="subtle">Keine Fälle im gewählten Zeitraum.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__body">
              <h2>Fälle nach Status ({PRESETS.find((p) => p.key === preset)?.label})</h2>
              <dl className="dl">
                {(
                  [
                    { label: 'Gesamt', value: s.totals.all, status: '' },
                    { label: 'Entwurf', value: s.totals.draft, status: 'DRAFT' },
                    // "Wartet auf Kunde" aggregates SENT+VIEWED+CALLBACK — no
                    // single-status list filter, so it stays plain text.
                    { label: 'Wartet auf Kunde', value: s.totals.pending, status: null },
                    { label: 'Freigegeben', value: s.totals.approved, status: 'APPROVED' },
                    {
                      label: 'Teilweise freigegeben',
                      value: s.totals.partiallyApproved,
                      status: 'PARTIALLY_APPROVED',
                    },
                    { label: 'Abgelehnt', value: s.totals.declined, status: 'DECLINED' },
                    { label: 'Rückruf', value: s.totals.callback, status: 'CALLBACK' },
                    { label: 'Abgelaufen', value: s.totals.expired, status: 'EXPIRED' },
                    { label: 'Storniert', value: s.totals.cancelled, status: 'CANCELLED' },
                  ] as { label: string; value: number; status: string | null }[]
                ).map((row) => (
                  <div key={row.label} style={{ display: 'contents' }}>
                    <dt>{row.label}</dt>
                    <dd>
                      {row.status === null ? (
                        row.value
                      ) : (
                        <Link
                          href={listHref(preset, row.status ? { status: row.status } : {})}
                          aria-label={`${row.value} Fälle${row.status ? ` mit Status ${row.label}` : ''} in der Liste anzeigen`}
                        >
                          {row.value}
                        </Link>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </>
      )}
    </>
  );
}
