import { formatPriceBand } from '@saf/ui';
import { api, ApiClientError } from '@/lib/api';
import { ActionsPanel } from './_actions-panel';

interface PublicView {
  reference: string;
  subject: string;
  description?: string | null;
  urgency: string;
  status: string;
  workspace: { name: string; currency: string };
  customerName?: string | null;
  vehicle?: string | null;
  vehiclePlate?: string | null;
  items: {
    title: string;
    description?: string | null;
    priceMinMinor?: number | null;
    priceMaxMinor?: number | null;
    currency: string;
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

export default async function PublicApprovalPage({ params }: { params: { token: string } }) {
  let view: PublicView | null = null;
  let errorMsg: string | null = null;

  try {
    view = await api.request<PublicView>(`/api/v1/public/approvals/${params.token}`, {
      publicRoute: true,
    });
  } catch (e) {
    errorMsg =
      e instanceof ApiClientError
        ? e.code === 'TOKEN_EXPIRED'
          ? 'Dieser Link ist abgelaufen. Bitte kontaktieren Sie Ihre Werkstatt.'
          : 'Dieser Link ist ungültig oder wurde bereits zurückgezogen.'
        : 'Der Link konnte nicht geladen werden.';
  }

  if (!view) {
    return (
      <div className="public-page">
        <div className="public-card">
          <div className="card">
            <div className="card__body" style={{ textAlign: 'center' }}>
              <div className="empty__icon">🔒</div>
              <h2>Link nicht verfügbar</h2>
              <p className="subtle">{errorMsg}</p>
              <p className="subtle" style={{ marginTop: 12 }}>
                Bitte wenden Sie sich direkt an Ihre Werkstatt – gerne stellen wir Ihnen einen neuen
                Link aus.
              </p>
            </div>
          </div>
          <div className="public-foot">Bereitgestellt über Smart Approval Flow</div>
        </div>
      </div>
    );
  }

  const urgent = view.urgency === 'HIGH';

  return (
    <div className="public-page">
      <div className="public-card">
        {/* Branded header — builds trust */}
        <div className="public-header">
          <div className="public-brand-logo">{initials(view.workspace.name)}</div>
          <div>
            <div style={{ fontWeight: 700 }}>{view.workspace.name}</div>
            <div className="subtle">Freigabeanfrage · {view.reference}</div>
          </div>
        </div>

        <div className="card">
          <div className="card__body stack">
            {urgent && (
              <div className="alert alert--danger">
                Sicherheitsrelevant — bitte zeitnah entscheiden.
              </div>
            )}

            <div>
              <p className="subtle" style={{ marginBottom: 4 }}>
                Guten Tag {view.customerName ?? ''}
              </p>
              <h1 style={{ fontSize: 'var(--text-xl)' }}>{view.subject}</h1>
              {view.vehicle && (
                <p className="subtle">
                  Ihr Fahrzeug: {view.vehicle}
                  {view.vehiclePlate ? ` · ${view.vehiclePlate}` : ''}
                </p>
              )}
            </div>

            <p style={{ margin: 0 }}>
              Bei der Kontrolle Ihres Fahrzeugs haben wir eine empfohlene Arbeit festgestellt. Bitte
              prüfen Sie kurz und geben Sie uns Bescheid – das dauert weniger als eine Minute.
            </p>

            {view.description && <p className="subtle">{view.description}</p>}

            <div>
              {view.items.map((it, i) => (
                <div key={i} className="public-item">
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
                <div className="subtle">Voraussichtliche Kosten</div>
                <div className="public-price">
                  {formatPriceBand(
                    view.priceMinMinor,
                    view.priceMaxMinor,
                    view.workspace.currency,
                  )}
                </div>
                <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>
                  Richtpreis inkl. Teile &amp; Arbeit. Endbetrag kann leicht abweichen.
                </div>
              </div>
            )}

            <ActionsPanel token={params.token} initialStatus={view.status} />

            <p
              className="subtle"
              style={{ textAlign: 'center', fontSize: 'var(--text-xs)', margin: 0 }}
            >
              Unsicher? Wählen Sie „Rückruf wünschen“ – wir beraten Sie gerne persönlich.
              {view.expiresAt && (
                <>
                  {' '}
                  Dieser Link ist bis zum {new Date(view.expiresAt).toLocaleDateString('de-CH')}{' '}
                  gültig.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="trust-row">
          <span>🔒 Sichere Verbindung</span>
          <span>✓ Kein Login nötig</span>
          <span>📄 Dokumentiert</span>
        </div>
        <div className="public-foot">
          Bereitgestellt über Smart Approval Flow für {view.workspace.name}
          {view.expiresAt && (
            <>
              {' '}
              · Gültig bis {new Date(view.expiresAt).toLocaleDateString('de-CH')}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
