import { formatPriceBand, resolveLocale, t, type Locale } from '@saf/ui';
import { api, ApiClientError } from '@/lib/api';
import { ActionsPanel } from './_actions-panel';

interface PublicView {
  reference: string;
  subject: string;
  description?: string | null;
  urgency: string;
  status: string;
  workspace: {
    name: string;
    currency: string;
    locale?: string | null;
    brandColor?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  };
  customerName?: string | null;
  vehicle?: string | null;
  vehiclePlate?: string | null;
  items: {
    id: string;
    title: string;
    description?: string | null;
    priceMinMinor?: number | null;
    priceMaxMinor?: number | null;
    currency: string;
    decision?: string | null;
    photos?: { fileName: string; contentType: string; url: string }[];
  }[];
  priceMinMinor?: number | null;
  priceMaxMinor?: number | null;
  expiresAt?: string | null;
}

export const dynamic = 'force-dynamic';

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default async function PublicApprovalPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { lang?: string };
}) {
  let view: PublicView | null = null;
  let errorCode: 'expired' | 'invalid' | null = null;

  try {
    view = await api.request<PublicView>(`/api/v1/public/approvals/${params.token}`, {
      publicRoute: true,
    });
  } catch (e) {
    errorCode =
      e instanceof ApiClientError && e.code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid';
  }

  // Resolve the display language: explicit ?lang wins, then the tenant locale,
  // with a safe fallback to German. On an error we only have ?lang.
  const locale: Locale = resolveLocale(searchParams?.lang, view?.workspace.locale);

  if (!view) {
    return (
      <div className="public-page" lang={locale}>
        <main className="public-card">
          <div className="card">
            <div className="card__body" style={{ textAlign: 'center' }}>
              <div className="empty__icon" aria-hidden="true">
                🔒
              </div>
              <h2>{t(locale, 'linkUnavailableTitle')}</h2>
              <p className="subtle">
                {errorCode === 'expired' ? t(locale, 'expiredMsg') : t(locale, 'invalidMsg')}
              </p>
              <p className="subtle" style={{ marginTop: 12 }}>
                {t(locale, 'contactWorkshop')}
              </p>
            </div>
          </div>
          <div className="public-foot">{t(locale, 'providedVia')}</div>
        </main>
      </div>
    );
  }

  const urgent = view.urgency === 'HIGH';
  const localeDate = locale === 'fr' ? 'fr-CH' : locale === 'it' ? 'it-CH' : 'de-CH';
  // White-label accent: override the brand token with the workspace's colour.
  const brandStyle = view.workspace.brandColor
    ? ({ ['--color-brand-500']: view.workspace.brandColor } as React.CSSProperties)
    : undefined;

  return (
    <div className="public-page" style={brandStyle} lang={locale}>
      <main className="public-card">
        {/* Branded header — builds trust */}
        <div className="public-header">
          <div className="public-brand-logo" aria-hidden="true">
            {initials(view.workspace.name)}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{view.workspace.name}</div>
            <div className="subtle">
              {t(locale, 'approvalRequest')} · {view.reference}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__body stack">
            {urgent && (
              <div className="alert alert--danger" role="alert">
                {t(locale, 'urgent')}
              </div>
            )}

            <div>
              <p className="subtle" style={{ marginBottom: 4 }}>
                {t(locale, 'greeting', { name: view.customerName ?? '' })}
              </p>
              <h1 style={{ fontSize: 'var(--text-xl)' }}>{view.subject}</h1>
              {view.vehicle && (
                <p className="subtle">
                  {t(locale, 'yourVehicle', {
                    vehicle: `${view.vehicle}${view.vehiclePlate ? ` · ${view.vehiclePlate}` : ''}`,
                  })}
                </p>
              )}
            </div>

            <p style={{ margin: 0 }}>{t(locale, 'intro')}</p>

            {view.description && <p className="subtle">{view.description}</p>}

            <div>
              {view.items.map((it, i) => (
                <div key={it.id ?? i} className="public-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong>{it.title}</strong>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {formatPriceBand(it.priceMinMinor, it.priceMaxMinor, it.currency)}
                    </span>
                  </div>
                  {it.description && (
                    <p className="subtle" style={{ margin: '4px 0 0' }}>
                      {it.description}
                    </p>
                  )}
                  {it.photos && it.photos.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {it.photos.map((p, pi) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={pi}
                          src={p.url}
                          alt={p.fileName}
                          style={{
                            width: 96,
                            height: 96,
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {(view.priceMinMinor || view.priceMaxMinor) && (
              <div
                style={{
                  borderTop: '2px solid var(--color-border)',
                  paddingTop: 12,
                  textAlign: 'center',
                }}
              >
                <div className="subtle">{t(locale, 'costLabel')}</div>
                <div className="public-price">
                  {formatPriceBand(
                    view.priceMinMinor,
                    view.priceMaxMinor,
                    view.workspace.currency,
                  )}
                </div>
                <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                  {t(locale, 'costHint')}
                </div>
              </div>
            )}

            <ActionsPanel
              token={params.token}
              locale={locale}
              initialStatus={view.status}
              items={view.items.map((it) => ({
                id: it.id,
                title: it.title,
                priceLabel: formatPriceBand(it.priceMinMinor, it.priceMaxMinor, it.currency),
              }))}
            />

            <p
              className="subtle"
              style={{ textAlign: 'center', fontSize: 'var(--text-xs)', margin: 0 }}
            >
              {t(locale, 'unsureHint')}
              {view.expiresAt && (
                <> {t(locale, 'validUntil', { date: new Date(view.expiresAt).toLocaleDateString(localeDate) })}</>
              )}
            </p>
          </div>
        </div>

        <div className="trust-row">
          <span>{t(locale, 'trustSecure')}</span>
          <span>{t(locale, 'trustNoLogin')}</span>
          <span>{t(locale, 'trustDocumented')}</span>
        </div>
        {(view.workspace.contactEmail || view.workspace.contactPhone) && (
          <div style={{ textAlign: 'center', fontSize: 'var(--text-sm)' }}>
            {t(locale, 'questions', { name: view.workspace.name })}
            {view.workspace.contactPhone ? ` · ${view.workspace.contactPhone}` : ''}
            {view.workspace.contactEmail ? ` · ${view.workspace.contactEmail}` : ''}
          </div>
        )}
        <div className="public-foot">
          {t(locale, 'providedVia')}
          {view.expiresAt && (
            <> · {t(locale, 'validUntil', { date: new Date(view.expiresAt).toLocaleDateString(localeDate) })}</>
          )}
        </div>
      </main>
    </div>
  );
}
