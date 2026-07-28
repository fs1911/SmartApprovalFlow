import Link from 'next/link';

export const metadata = { title: 'Seite nicht gefunden — Smart Approval Flow' };

/** Global 404. Kept calm and on-brand; offers a way back rather than a dead end. */
export default function NotFound() {
  return (
    <div className="public-page">
      <main className="public-card">
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center' }}>
            <div className="empty__icon" aria-hidden="true">
              🧭
            </div>
            <h1 style={{ fontSize: 'var(--text-xl)' }}>Seite nicht gefunden</h1>
            <p className="subtle" style={{ marginTop: 8 }}>
              Diese Seite existiert nicht oder wurde verschoben.
            </p>
            <div style={{ marginTop: 20 }}>
              <Link href="/" className="btn btn--primary" style={{ width: 'auto' }}>
                Zur Startseite
              </Link>
            </div>
          </div>
        </div>
        <div className="public-foot">Smart Approval Flow</div>
      </main>
    </div>
  );
}
