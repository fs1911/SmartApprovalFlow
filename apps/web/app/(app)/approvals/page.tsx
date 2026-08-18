import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ITEM_CATEGORY, ITEM_CATEGORY_LABELS, URGENCY, CREATED_WITHIN } from '@saf/types';
import { URGENCY_PRESENTATION, STATUS_PRESENTATION } from '@saf/ui';
import { api, ApiClientError } from '@/lib/api';
import { getMe, can } from '@/lib/session';
import { StatusBadge, UrgencyBadge } from '@/app/_components/badges';
import { EmptyState } from '@/app/_components/empty-state';
import { SavedViews, type SavedView } from './_saved-views';

interface Filters {
  assignee?: string;
  category?: string;
  urgency?: string;
  createdWithin?: string;
  createdFrom?: string;
  createdTo?: string;
  status?: string;
  sort?: string;
}

/** A calendar date the API accepts (YYYY-MM-DD); anything else is ignored. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Build an /approvals href preserving the active filters (overrides merged in). */
function filterHref(current: Filters, override: Filters = {}): string {
  const merged = { ...current, ...override };
  const sp = new URLSearchParams();
  if (merged.assignee) sp.set('assignee', merged.assignee);
  if (merged.category) sp.set('category', merged.category);
  if (merged.urgency) sp.set('urgency', merged.urgency);
  if (merged.createdWithin) sp.set('createdWithin', merged.createdWithin);
  if (merged.createdFrom) sp.set('createdFrom', merged.createdFrom);
  if (merged.createdTo) sp.set('createdTo', merged.createdTo);
  if (merged.status) sp.set('status', merged.status);
  // 'newest' is the default, so only the explicit 'oldest' is carried in the URL.
  if (merged.sort && merged.sort !== 'newest') sp.set('sort', merged.sort);
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
  searchParams: {
    assignee?: string;
    category?: string;
    urgency?: string;
    createdWithin?: string;
    createdFrom?: string;
    createdTo?: string;
    status?: string;
    sort?: string;
    /** "1" opts out of auto-applying the personal default view (Block 29). */
    all?: string;
  };
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
  const activeWithin = (CREATED_WITHIN as readonly string[]).includes(
    searchParams.createdWithin ?? '',
  )
    ? searchParams.createdWithin
    : undefined;
  const activeStatus = searchParams.status || undefined;
  const activeFrom = DATE_RE.test(searchParams.createdFrom ?? '')
    ? searchParams.createdFrom
    : undefined;
  const activeTo = DATE_RE.test(searchParams.createdTo ?? '') ? searchParams.createdTo : undefined;
  // A free date range takes precedence over the preset window (mirrors the API).
  const rangeActive = Boolean(activeFrom || activeTo);
  const effectiveWithin = rangeActive ? undefined : activeWithin;
  const activeSort = searchParams.sort === 'oldest' ? 'oldest' : 'newest';
  // Filters we carry across every chip link. `sort` rides along so it survives
  // filter changes, but it is not a filter (excluded from the equality checks
  // and hasActiveFilters below).
  const active: Filters = {
    assignee: searchParams.assignee,
    category: activeCategory,
    urgency: activeUrgency,
    createdWithin: effectiveWithin,
    createdFrom: activeFrom,
    createdTo: activeTo,
    status: activeStatus,
    sort: activeSort === 'oldest' ? 'oldest' : undefined,
  };
  /** The active filters without `sort`, for saved-view/default equality checks. */
  const activeFilters: Filters = { ...active, sort: undefined };
  const hasActiveFilters = Boolean(
    mine ||
    activeCategory ||
    activeUrgency ||
    effectiveWithin ||
    activeFrom ||
    activeTo ||
    activeStatus,
  );
  const optedOutOfDefault = searchParams.all === '1';

  // Saved views + personal default. Fetched first so a bare list can auto-apply
  // the caller's default before we query cases. Never block the list on this.
  let views: SavedView[] = [];
  let defaultViewId: string | null = null;
  try {
    const res = await api.request<{ views: SavedView[]; defaultViewId: string | null }>(
      '/api/v1/saved-views',
    );
    views = res.views;
    defaultViewId = res.defaultViewId;
  } catch {
    views = [];
    defaultViewId = null;
  }

  // Auto-apply the personal default on a bare list (unless explicitly opted out).
  // Only redirect when the default actually carries filters, to avoid a loop.
  const defaultView = defaultViewId ? views.find((v) => v.id === defaultViewId) : undefined;
  if (!hasActiveFilters && !optedOutOfDefault && defaultView) {
    const defHref = filterHref({}, defaultView.filters as Filters);
    if (defHref !== '/approvals') redirect(defHref);
  }
  // The default view is "active" when the current filters equal its filters.
  const defaultApplied =
    !!defaultView &&
    !optedOutOfDefault &&
    filterHref({}, defaultView.filters as Filters) === filterHref({}, activeFilters);

  // The saved view (if any) whose filters exactly match the active filters —
  // used to name the "no matches" empty state (Block 35).
  const activeHref = filterHref({}, activeFilters);
  const activeSavedView = hasActiveFilters
    ? views.find((v) => filterHref({}, v.filters as Filters) === activeHref)
    : undefined;

  // Human-readable summary of the currently active filters (Block 36). Each chip
  // links to the same list with just that one filter removed. The date range is
  // a single chip that clears both bounds; preset window and range are mutually
  // exclusive (rangeActive drops effectiveWithin), so at most one time chip shows.
  const activeFilterChips: { label: string; remove: Filters }[] = [];
  if (mine) activeFilterChips.push({ label: 'Meine Fälle', remove: { assignee: undefined } });
  if (activeCategory)
    activeFilterChips.push({
      label: `Kategorie: ${ITEM_CATEGORY_LABELS[activeCategory as keyof typeof ITEM_CATEGORY_LABELS]}`,
      remove: { category: undefined },
    });
  if (activeUrgency)
    activeFilterChips.push({
      label: `Dringlichkeit: ${URGENCY_PRESENTATION[activeUrgency]?.label ?? activeUrgency}`,
      remove: { urgency: undefined },
    });
  if (effectiveWithin)
    activeFilterChips.push({
      label: `Zeitraum: ${WITHIN_LABELS[effectiveWithin] ?? effectiveWithin}`,
      remove: { createdWithin: undefined },
    });
  if (rangeActive)
    activeFilterChips.push({
      label: `Zeitraum: ${activeFrom ?? '…'} – ${activeTo ?? '…'}`,
      remove: { createdFrom: undefined, createdTo: undefined },
    });
  if (activeStatus)
    activeFilterChips.push({
      label: `Status: ${STATUS_PRESENTATION[activeStatus]?.label ?? activeStatus}`,
      remove: { status: undefined },
    });

  let cases: CaseRow[] = [];
  let error: string | null = null;
  try {
    const params = new URLSearchParams({ limit: '100' });
    if (mine) params.set('assignee', 'me');
    if (activeCategory) params.set('category', activeCategory);
    if (activeUrgency) params.set('urgency', activeUrgency);
    if (effectiveWithin) params.set('createdWithin', effectiveWithin);
    if (activeFrom) params.set('createdFrom', activeFrom);
    if (activeTo) params.set('createdTo', activeTo);
    if (activeStatus) params.set('status', activeStatus);
    if (activeSort === 'oldest') params.set('sort', 'oldest');
    cases = await api.request<CaseRow[]>(`/api/v1/approval-cases?${params.toString()}`);
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  // CSV export of exactly the filtered list (Block 40): reuse the active filters,
  // drop the list-only `limit`, and download via the same-origin proxy route.
  const exportParams = new URLSearchParams();
  if (mine) exportParams.set('assignee', 'me');
  if (activeCategory) exportParams.set('category', activeCategory);
  if (activeUrgency) exportParams.set('urgency', activeUrgency);
  if (effectiveWithin) exportParams.set('createdWithin', effectiveWithin);
  if (activeFrom) exportParams.set('createdFrom', activeFrom);
  if (activeTo) exportParams.set('createdTo', activeTo);
  if (activeStatus) exportParams.set('status', activeStatus);
  if (activeSort === 'oldest') exportParams.set('sort', 'oldest');
  const exportQs = exportParams.toString();
  const exportHref = exportQs ? `/approvals/export?${exportQs}` : '/approvals/export';

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Freigaben</h1>
          <p className="subtle">Alle Freigabeanfragen und ihr aktueller Status.</p>
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {!error && cases.length > 0 && (
            <a
              className="btn btn--ghost"
              href={exportHref}
              aria-label="Gefilterte Freigaben als CSV exportieren"
            >
              ⭳ CSV-Export
            </a>
          )}
          {canCreate && (
            <Link href="/approvals/new" className="btn btn--primary">
              + Neue Freigabe
            </Link>
          )}
        </div>
      </div>

      <div
        className="row"
        style={{ gap: 6, marginBottom: 12 }}
        role="group"
        aria-label="Filter nach Zuständigkeit"
      >
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
          href={filterHref(active, {
            createdWithin: undefined,
            createdFrom: undefined,
            createdTo: undefined,
          })}
          className={`btn ${!effectiveWithin && !rangeActive ? 'btn--primary' : 'btn--ghost'}`}
          aria-current={!effectiveWithin && !rangeActive ? 'true' : undefined}
        >
          Gesamter Zeitraum
        </Link>
        {CREATED_WITHIN.map((w) => (
          <Link
            key={w}
            href={filterHref(active, {
              createdWithin: w,
              createdFrom: undefined,
              createdTo: undefined,
            })}
            className={`btn ${effectiveWithin === w ? 'btn--primary' : 'btn--ghost'}`}
            aria-current={effectiveWithin === w ? 'true' : undefined}
          >
            {WITHIN_LABELS[w]}
          </Link>
        ))}
      </div>

      {/* Free date range (Block 31) — a GET form so it works without client JS.
          Applying a range overrides the preset window above (mirrors the API). */}
      <form
        action="/approvals"
        method="get"
        className="row"
        style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}
        aria-label="Filter nach freiem Datumsbereich"
      >
        {/* Preserve the other active filters across the range submit. */}
        {mine && <input type="hidden" name="assignee" value="me" />}
        {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
        {activeUrgency && <input type="hidden" name="urgency" value={activeUrgency} />}
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <label style={{ display: 'grid', gap: 2, fontSize: 'var(--text-xs)' }}>
          Von
          <input
            type="date"
            name="createdFrom"
            defaultValue={activeFrom ?? ''}
            max={activeTo ?? undefined}
          />
        </label>
        <label style={{ display: 'grid', gap: 2, fontSize: 'var(--text-xs)' }}>
          Bis
          <input
            type="date"
            name="createdTo"
            defaultValue={activeTo ?? ''}
            min={activeFrom ?? undefined}
          />
        </label>
        <button type="submit" className="btn btn--secondary">
          Zeitraum anwenden
        </button>
        {rangeActive && (
          <Link
            href={filterHref(active, { createdFrom: undefined, createdTo: undefined })}
            className="btn btn--ghost"
          >
            Zeitraum zurücksetzen
          </Link>
        )}
      </form>

      <div
        className="row"
        style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}
        role="group"
        aria-label="Sortierung"
      >
        <Link
          href={filterHref(active, { sort: 'newest' })}
          className={`btn ${activeSort === 'newest' ? 'btn--primary' : 'btn--ghost'}`}
          aria-current={activeSort === 'newest' ? 'true' : undefined}
        >
          Neueste zuerst
        </Link>
        <Link
          href={filterHref(active, { sort: 'oldest' })}
          className={`btn ${activeSort === 'oldest' ? 'btn--primary' : 'btn--ghost'}`}
          aria-current={activeSort === 'oldest' ? 'true' : undefined}
        >
          Älteste zuerst
        </Link>
      </div>

      <SavedViews
        views={views}
        current={active}
        canManage={canCreate}
        hasActiveFilters={hasActiveFilters}
        defaultViewId={defaultViewId}
      />

      {defaultApplied && (
        <div
          className="row"
          style={{ gap: 8, marginBottom: 12, alignItems: 'center', fontSize: 'var(--text-xs)' }}
        >
          <span className="subtle">Standard-Ansicht „{defaultView!.name}" aktiv.</span>
          <Link href="/approvals?all=1" className="btn btn--ghost">
            Alle anzeigen
          </Link>
        </div>
      )}

      {activeFilterChips.length > 0 && (
        <div
          className="row"
          style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}
          role="group"
          aria-label="Aktive Filter"
        >
          <span className="subtle" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
            Aktive Filter:
          </span>
          {activeFilterChips.map((chip) => (
            <Link
              key={chip.label}
              href={filterHref(active, chip.remove)}
              className="btn btn--ghost"
              style={{ fontSize: 'var(--text-xs)' }}
              aria-label={`Filter „${chip.label}" entfernen`}
            >
              {chip.label} <span aria-hidden>✕</span>
            </Link>
          ))}
          <Link
            href="/approvals?all=1"
            className="btn btn--ghost"
            style={{ fontSize: 'var(--text-xs)' }}
          >
            Alle zurücksetzen
          </Link>
        </div>
      )}

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 16 }}>
          {error} — läuft die API unter <code>{api.base}</code>?
        </div>
      )}

      {!error && cases.length === 0 && hasActiveFilters ? (
        // Filters (or a saved view) are active but match nothing — offer a reset
        // instead of the onboarding call-to-action (Block 35).
        <EmptyState
          icon="🔍"
          title="Keine Treffer"
          description={
            activeSavedView
              ? `Die Ansicht „${activeSavedView.name}" enthält aktuell keine Fälle.`
              : 'Für die aktuellen Filter gibt es keine Freigaben.'
          }
          action={
            <Link href="/approvals?all=1" className="btn btn--secondary">
              Alle Filter zurücksetzen
            </Link>
          }
        />
      ) : !error && cases.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Noch keine Freigaben"
          description="Legen Sie Ihre erste Freigabeanfrage an. Der Kunde erhält einen sicheren Link und kann direkt freigeben, ablehnen oder einen Rückruf wünschen."
          action={
            canCreate ? (
              <Link href="/approvals/new" className="btn btn--primary">
                Erste Freigabe erstellen
              </Link>
            ) : undefined
          }
        />
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
