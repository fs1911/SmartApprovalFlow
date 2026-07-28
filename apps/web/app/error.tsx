'use client';

/**
 * Global error boundary. Client component per Next.js App Router contract.
 * Shows a reassuring message and a retry, never a raw stack trace to the user.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="public-page">
      <main className="public-card">
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center' }}>
            <div className="empty__icon" aria-hidden="true">
              ⚠️
            </div>
            <h1 style={{ fontSize: 'var(--text-xl)' }}>Etwas ist schiefgelaufen</h1>
            <p className="subtle" style={{ marginTop: 8 }}>
              Bitte versuchen Sie es erneut. Falls das Problem bestehen bleibt, laden Sie die Seite
              neu oder kontaktieren Sie den Support.
            </p>
            <div style={{ marginTop: 20 }}>
              <button className="btn btn--primary" style={{ width: 'auto' }} onClick={() => reset()}>
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
        <div className="public-foot">Smart Approval Flow</div>
      </main>
    </div>
  );
}
