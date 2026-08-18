import type { ReactNode } from 'react';
import Link from 'next/link';

/** Shared centered card used by all loginless auth pages (Block 10). */
export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
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
            <span className="mk-brand__logo">K</span>
            <span className="mk-brand__name">Klarwerk</span>
          </Link>
        </div>
        <div className="card">
          <div className="card__body">
            <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>{title}</h1>
            {children}
          </div>
        </div>
        {footer && (
          <p className="subtle" style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}
