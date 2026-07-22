import Link from 'next/link';
import { BRAND, MARKETING_NAV } from './_content';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk-root">
      <header className="mk-header">
        <div className="mk-container mk-header__inner">
          <Link href="/" className="mk-brand" aria-label={`${BRAND.name} Startseite`}>
            <span className="mk-brand__logo">S</span>
            <span className="mk-brand__name">{BRAND.short}</span>
          </Link>
          <nav className="mk-nav" aria-label="Hauptnavigation">
            {MARKETING_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="mk-nav__link">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mk-header__actions">
            <Link href="/login" className="mk-nav__link mk-nav__link--muted">
              Anmelden
            </Link>
            <Link href="/demo" className="btn btn--primary" style={{ width: 'auto' }}>
              Demo anfragen
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mk-footer">
        <div className="mk-container mk-footer__grid">
          <div>
            <div className="mk-brand">
              <span className="mk-brand__logo">S</span>
              <span className="mk-brand__name">{BRAND.short}</span>
            </div>
            <p className="subtle" style={{ marginTop: 12, maxWidth: 280 }}>
              {BRAND.tagline}. Digitale, belegbare Kundenfreigaben für unabhängige Garagen und
              Werkstätten.
            </p>
          </div>
          <div>
            <h4 className="mk-footer__title">Produkt</h4>
            <Link href="/product">Wie es funktioniert</Link>
            <Link href="/for-garages">Für Garagen</Link>
            <Link href="/pricing">Preise</Link>
            <Link href="/security">Sicherheit</Link>
            <Link href="/faq">FAQ</Link>
          </div>
          <div>
            <h4 className="mk-footer__title">Unternehmen</h4>
            <Link href="/demo">Demo &amp; Kontakt</Link>
            <Link href="/legal/imprint">Impressum</Link>
            <Link href="/legal/privacy">Datenschutz</Link>
            <Link href="/legal/terms">Nutzungsbedingungen</Link>
          </div>
          <div>
            <h4 className="mk-footer__title">Loslegen</h4>
            <Link href="/demo">Early Access anfragen</Link>
            <Link href="/dashboard">Zur App</Link>
          </div>
        </div>
        <div className="mk-container mk-footer__legal">
          <span>
            © {new Date().getFullYear()} {BRAND.name}. Alle Rechte vorbehalten.
          </span>
          <span className="subtle">Pilotphase · Preise vorläufig · Schweiz / DACH</span>
        </div>
      </footer>
    </div>
  );
}
