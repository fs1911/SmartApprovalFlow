import Link from 'next/link';
import { ITEM_CATEGORY, ITEM_CATEGORY_LABELS, URGENCY, CREATED_WITHIN } from '@saf/types';
import { URGENCY_PRESENTATION } from '@saf/ui';
import { api, ApiClientError } from '@/lib/api';
import { getMe, can } from '@/lib/session';
import { StatusBadge, UrgencyBadge } from '@/app/_components/badges';

interface Filters {
  assignee?: string;
  category?: string;
  urgency?: string;
  createdWithin?: string;
}

/** Build an /approvals href preserving the active filters (overrides merged in). */
function filterHref(current: Filters, override: Filters = {}): string {
  const merged = { ...current, ...override };
  const sp = new URLSearchParams();
  if (merged.assignee) sp.set('assignee', merged.assignee);
  if (merged.category) sp.set('category', merged.category);
  if (merged.urgency) sp.set('urgency', merged.urgency);
  if (merged.createdWithin) sp.set('createdWithin', merged.createdWithin);
  const qs = sp.toString();
  return qs ? `/approvals?${qs}` : '/approvals';
}

const WITHIN_LABELS: Record<string, string> = {
  '7d': '7 Tage',
  '30d': '30 Tage',
  '90d': '90 Tage',
  '365d': '1 Jahr',
};

interface CaseRow {
  id: string;
  reference: string;
  subject: string;
  status: string;
  urgency: string;
  createdAt: string;
  customer?: { name: string } | null;
  vehicle?: { plate?: string | null; make?: string | null; model?: string | null } | null;
  assignee?: { id: string; name: string } | null;
  _count?: { items: number };
}

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: { assignee?: string; category?: string; urgency?: string; createdWithin?: string };
}) {
  const me = await getMe();
  const canCreate = can(me, 'cases:create');
  const mine = searchParams.assignee === 'me';
  const activeCategory = (ITEM_CATEGORY as readonly string[]).includes(searchParams.category ?? '')
    ? searchParams.category
    : undefined;
  const activeUrgency = (URGENCY as readonly string[]).includes(searchParams.urgency ?? '')
    ? searchParams.urgency
    : undefined;
  const activeWithin = (CREATED_WITHIN as readonly string[]).includes(searchParams.createdWithin ?? '')
    ? searchParams.createdWithin
    : undefined;
  // Filters we carry across every chip link.
  const active: Filters = {
    assignee: searchParams.assignee,
    category: activeCategory,
    urgency: activeUrgency,
    createdWithin: activeWithin,
  };

  let cases: CaseRow[] = [];
  let error: string | null = null;
  try {
    const params = new URLSearchParams({ limit: '100' });
    if (mine) params.set('assignee', 'me');
    if (activeCategory) params.set('category', activeCategory);
    if (activeUrgency) params.set('urgency', activeUrgency);
    if (activeWithin) params.set('createdWithin', activeWithin);
    cases = await api.request<CaseRow[]>(`/api/v1/approval-cases?${params.toString()}`);
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
        {canCreate && (
          <Link href="/approvals/new" className="btn btn--primary">
            + Neue Freigabe
          </Link>
        )}
      </div>

      <div className="row" style={{ gap: 6, marginBottom: 12 }} role="group" aria-label="Filter nach Zuständigkeit">
        <Link
          href={filterHref(active, { assignee: undefined })}
          className={`btn ${!mine ? 'btn--primary' : 'btn--ghost'}`}
          aria-current={!mine ? 'true' : undefined}
        >
          Alle Fälle
        </Link>
        <Link
          href={filterHref(active, { assignee: 'me' })}
          className={`btn ${mine ? 'btn--primary' : 'btn--ghost'}`}
          aria-current={mine ? 'true' : undefined}
        >
          Meine Fälle
        </Link>
      </div>

      <div
        className="row"
        style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}
        role="group"
        aria-label="Filter nach Kategorie"
      >
        <Link
          href={filterHref(active, { category: undefined })}
          className={`btn ${!activeCategory ? 'btn--primary' : 'btn--ghost'}`}
          aria-current={!activeCategory ? 'true' : undefined}
        >
          Alle Kategorien
        </Link>
        {ITEM_CATEGORY.map((cat) => (
          <Link
            key={cat}
            href={filterHref(active, { category: cat })}
            className={`btn ${activeCategory === cat ? 'btn--primary' : 'btn--ghost'}`}
            aria-current={activeCategory === cat ? 'true' : undefined}
          >
            {ITEM_CATEGORY_LABELS[cat]}
          </Link>
        ))}
      </div>

      <div
        className="row"
        style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}
        role="group"
        aria-label="Filter nach Dringlichkeit"
      >
        <Link
          href={filterHref(active, { urgency: undefined })}
          className={`btn ${!activeUrgency ? 'btn--primary' : 'btn--ghost'}`}
          aria-current={!activeUrgency ? 'true' : undefined}
        >
          Alle Dringlichkeiten
        </Link>
        {URGENCY.map((u) => (
          <Link
            key={u}
            href={filterHref(active, { urgency: u })}
            className={`btn ${activeUrgency === u ? 'btn--primary' : 'btn--ghost'}`}
            aria-current={activeUrgency === u ? 'true' : undefined}
          >
            {URGENCY_PRESENTATION[u]?.label ?? u}
          </Link>
        ))}
      </div>

      <div
        className="row"
        style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}
        role="group"
        aria-label="Filter nach Zeitraum"
      >
        <Link
          href={filterHref(active, { createdWithin: undefined })}
          className={`btn ${!activeWithin ? 'btn--primary' : 'btn--ghost'}`}
          aria-current={!activeWithin ? 'true' : undefined}
        >
          Gesamter Zeitraum
        </Link>
        {CREATED_WITHIN.map((w) => (
          <Link
            key={w}
            href={filterHref(active, { createdWithin: w })}
            className={`btn ${activeWithin === w ? 'btn--primary' : 'btn--ghost'}`}
            aria-current={activeWithin === w ? 'true' : undefined}
          >
            {WITHIN_LABELS[w]}
          </Link>
        ))}
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
          {canCreate && (
            <Link href="/approvals/new" className="btn btn--primary">
              Erste Freigabe erstellen
            </Link>
          )}
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
                  {c.assignee ? ` · 👤 ${c.assignee.name}` : ''}
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
