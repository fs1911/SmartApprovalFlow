import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './_login-form';

export const metadata: Metadata = {
  title: 'Anmelden — Smart Approval Flow',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  const isDev = process.env.NODE_ENV !== 'production';
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--color-surface-subtle)',
        padding: 'var(--space-5)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
          <Link href="/" className="mk-brand" style={{ justifyContent: 'center' }}>
            <span className="mk-brand__logo">S</span>
            <span className="mk-brand__name">Smart Approval</span>
          </Link>
        </div>
        <div className="card">
          <div className="card__body">
            <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Anmelden</h1>
            <LoginForm />
            <p className="subtle" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>
              <Link href="/forgot-password">Passwort vergessen?</Link>
            </p>
            {isDev && (
              <p className="subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-4)' }}>
                Dev-Login: <code>owner@muster-garage.ch</code> / <code>password123</code>
              </p>
            )}
          </div>
        </div>
        <p className="subtle" style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
          <Link href="/">← Zurück zur Website</Link>
        </p>
      </div>
    </div>
  );
}
