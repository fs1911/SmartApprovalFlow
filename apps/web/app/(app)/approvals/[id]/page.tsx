import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatPriceBand, AUDIT_LABELS } from '@saf/ui';
import { api, ApiClientError } from '@/lib/api';
import { StatusBadge, UrgencyBadge } from '@/app/_components/badges';
import { LinkPanel } from './_link-panel';
import { CaseActions } from './_case-actions';

interface CaseDetail {
  id: string;
  reference: string;
  subject: string;
  description?: string | null;
  status: string;
  urgency: string;
  createdAt: string;
  sentAt?: string | null;
  openedAt?: string | null;
  lastReminderAt?: string | null;
  reminderCount?: number;
  respondedAt?: string | null;
  customer?: { name: string; email?: string | null; phone?: string | null } | null;
  vehicle?: {
    plate?: string | null;
    make?: string | null;
    model?: string | null;
    year?: number | null;
  } | null;
  items: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    priceMinMinor?: number | null;
    priceMaxMinor?: number | null;
    currency: string;
  }[];
  decisions: { id: string; decision: string; note?: string | null; createdAt: string }[];
  auditEvents: {
    id: string;
    type: string;
    actorType: string;
    actorLabel?: string | null;
    createdAt: string;
  }[];
  accessLink?: { id: string; expiresAt?: string | null } | null;
}

export const dynamic = 'force-dynamic';

function fmtDate(d: string) {
  return new Date(d).toLocaleString('de-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function ApprovalDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string };
}) {
  let c: CaseDetail;
  try {
    c = await api.request<CaseDetail>(`/api/v1/approval-cases/${params.id}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) notFound();
    throw e;
  }

  const totalMin = c.items.reduce((s, it) => s + (it.priceMinMinor ?? 0), 0);
  const totalMax = c.items.reduce((s, it) => s + (it.priceMaxMinor ?? 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <p className="subtle" style={{ marginBottom: 4 }}>
            <Link href="/approvals">Freigaben</Link> / {c.reference}
          </p>
          <h1>{c.subject}</h1>
          <div className="row" style={{ alignItems: 'center', marginTop: 4 }}>
            <StatusBadge status={c.status} />
            <UrgencyBadge urgency={c.urgency} />
          </div>
        </div>
      </div>

      {searchParams.created === '1' && (
        <div className="alert alert--success" style={{ marginBottom: 20 }}>
          Freigabe erfolgreich angelegt. Erzeugen Sie unten den Kundenlink, um sie zu versenden.
        </div>
      )}

      <div className="row" style={{ alignItems: 'flex-start' }}>
        {/* Left column */}
        <div className="stack" style={{ flex: '1 1 420px' }}>
          <div className="card">
            <div className="card__body">
              <h2>Empfohlene Arbeiten</h2>
              {c.description && <p className="subtle">{c.description}</p>}
              <div className="stack" style={{ marginTop: 8 }}>
                {c.items.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 16,
                      paddingBottom: 8,
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{it.title}</div>
                      {it.description && <div className="subtle">{it.description}</div>}
                    </div>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatPriceBand(it.priceMinMinor, it.priceMaxMinor, it.currency)}
                    </div>
                  </div>
                ))}
              </div>
              {(totalMin > 0 || totalMax > 0) && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 14,
                    fontSize: 'var(--text-lg)',
                    fontWeight: 700,
                  }}
                >
                  <span>Geschätzt gesamt</span>
                  <span>{formatPriceBand(totalMin, totalMax, c.items[0]?.currency ?? 'CHF')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__body">
              <h2>Verlauf (Audit Trail)</h2>
              <div className="timeline">
                {c.auditEvents.map((ev) => (
                  <div key={ev.id} className="timeline__item">
                    <div className="timeline__dot" />
                    <div>
                      <div className="timeline__label">{AUDIT_LABELS[ev.type] ?? ev.type}</div>
                      <div className="timeline__time">
                        {fmtDate(ev.createdAt)} · {ev.actorLabel ?? ev.actorType}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="stack" style={{ flex: '1 1 300px' }}>
          {!['APPROVED', 'DECLINED', 'EXPIRED', 'CANCELLED'].includes(c.status) && (
            <div className="card">
              <div className="card__body">
                <h2>Versand</h2>
                <CaseActions caseId={c.id} status={c.status} />
              </div>
            </div>
          )}

          <div className="card">
            <div className="card__body">
              <h2>Kundenlink</h2>
              <LinkPanel caseId={c.id} hasLink={Boolean(c.accessLink)} />
            </div>
          </div>

          <div className="card">
            <div className="card__body">
              <h2>Kunde &amp; Fahrzeug</h2>
              <dl className="dl">
                <dt>Kunde</dt>
                <dd>{c.customer?.name ?? '—'}</dd>
                <dt>E-Mail</dt>
                <dd>{c.customer?.email ?? '—'}</dd>
                <dt>Telefon</dt>
                <dd>{c.customer?.phone ?? '—'}</dd>
                <dt>Fahrzeug</dt>
                <dd>
                  {[c.vehicle?.make, c.vehicle?.model, c.vehicle?.year].filter(Boolean).join(' ') ||
                    '—'}
                </dd>
                <dt>Kennzeichen</dt>
                <dd>{c.vehicle?.plate ?? '—'}</dd>
              </dl>
            </div>
          </div>

          <div className="card">
            <div className="card__body">
              <h2>Versanddetails</h2>
              <dl className="dl">
                <dt>Referenz</dt>
                <dd>{c.reference}</dd>
                <dt>Erstellt</dt>
                <dd>{fmtDate(c.createdAt)}</dd>
                <dt>Gesendet</dt>
                <dd>{c.sentAt ? fmtDate(c.sentAt) : '—'}</dd>
                <dt>Geöffnet</dt>
                <dd>{c.openedAt ? fmtDate(c.openedAt) : 'noch nicht'}</dd>
                <dt>Erinnerungen</dt>
                <dd>
                  {c.reminderCount ? `${c.reminderCount}×` : '—'}
                  {c.lastReminderAt ? ` (zuletzt ${fmtDate(c.lastReminderAt)})` : ''}
                </dd>
                <dt>Beantwortet</dt>
                <dd>{c.respondedAt ? fmtDate(c.respondedAt) : '—'}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
