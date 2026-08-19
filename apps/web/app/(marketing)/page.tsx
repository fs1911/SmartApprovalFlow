import type { Metadata } from 'next';
import Link from 'next/link';
import { HERO, BENEFITS, BRAND, POSITIONING } from './_content';
import { Section, Eyebrow, CtaRow, FinalCta } from './_components';
import { ScrollStory } from './_scroll-story';

export const metadata: Metadata = {
  title: `${BRAND.name} — Digitale Freigaben für Werkstätten`,
  description:
    'Zusatzarbeiten digital freigeben lassen: sicherer Link mit Foto, Klartext und Preisband. ' +
    'Ihre Kundschaft entscheidet mobil – ohne App, ohne Login. Jede Freigabe dokumentiert.',
  alternates: { canonical: '/' },
  openGraph: {
    title: `${BRAND.name} — Digitale Freigaben für Werkstätten`,
    description: 'Zusatzarbeiten in Minuten freigeben lassen – belegbar, mobil, ohne Login.',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mk-hero">
        <div className="mk-container mk-hero__inner">
          <div className="mk-hero__copy">
            <Eyebrow>Für unabhängige Garagen &amp; Werkstätten</Eyebrow>
            <h1>
              {HERO.headline.split('in Minuten').flatMap((part, i) =>
                i === 0
                  ? [part]
                  : [
                      <span key="acc" className="mk-accent">
                        in Minuten
                      </span>,
                      part,
                    ],
              )}
            </h1>
            <p className="mk-hero__sub">{HERO.subline}</p>
            <CtaRow primary={HERO.primaryCta} secondary={HERO.secondaryCta} />
            <div className="mk-hero__trust">
              <span>🔒 Ohne App &amp; ohne Login</span>
              <span>📄 Revisionssicher dokumentiert</span>
              <span>⚡ In einem Tag startklar</span>
            </div>
          </div>

          {/* Product mockup: the customer's loginless approval view. */}
          <div className="mk-hero__visual">
            <div
              className="mk-device"
              role="img"
              aria-label="Vorschau der Kunden-Freigabeseite auf dem Smartphone"
            >
              <div className="mk-device__screen">
                <div className="mk-device__bar">
                  <div className="mk-device__brand">Klarwerk</div>
                  <div className="mk-device__title">Muster-Garage · Freigabe AC-2026-0142</div>
                </div>
                <div className="mk-device__body">
                  <div className="mk-line">
                    <span>
                      <span className="mk-line__label">Bremsbeläge vorne ersetzen</span>
                      <br />
                      <span className="mk-line__hint">Sicherheit · empfohlen</span>
                    </span>
                    <span className="mk-line__price">180–220.–</span>
                  </div>
                  <div className="mk-line">
                    <span>
                      <span className="mk-line__label">Ölservice inkl. Filter</span>
                      <br />
                      <span className="mk-line__hint">Wartung</span>
                    </span>
                    <span className="mk-line__price">140–160.–</span>
                  </div>
                  <div className="mk-line">
                    <span>
                      <span className="mk-line__label">Zündkerzen (4×)</span>
                      <br />
                      <span className="mk-line__hint">Wartung</span>
                    </span>
                    <span className="mk-line__price">95–120.–</span>
                  </div>
                  <div className="mk-device__total">
                    <span>Geschätzt gesamt</span>
                    <span>415–500.–</span>
                  </div>
                  <div className="mk-device__actions">
                    <span className="mk-btn-approve">✓ Freigeben</span>
                    <span className="mk-btn-decline">Ablehnen</span>
                  </div>
                  <div className="mk-device__foot">
                    Bereitgestellt über Klarwerk · sicher &amp; belegbar
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → value */}
      <Section>
        <Eyebrow>Das Problem</Eyebrow>
        <h2>Freigaben per Telefon sind langsam, unklar und schlecht belegbar.</h2>
        <p className="mk-lead">
          Zusatzarbeiten gehen verloren, Fahrzeuge stehen, und bei der Rechnung entstehen
          Diskussionen. Klarwerk macht aus der Freigabe einen klaren, dokumentierten
          Schritt – den Ihre Kundschaft in Sekunden versteht.
        </p>
      </Section>

      {/* Benefits */}
      <Section muted>
        <Eyebrow>Warum Garagen es nutzen</Eyebrow>
        <h2>Schneller, professioneller, nachvollziehbar.</h2>
        <div className="mk-grid" style={{ marginTop: 'var(--space-6)' }}>
          {BENEFITS.map((b) => (
            <div key={b.title} className="mk-feature">
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works — scroll-driven story of the customer journey */}
      <ScrollStory />
      <Section>
        <Link href="/product">Ausführlich ansehen →</Link>
      </Section>

      {/* Positioning line */}
      <Section muted>
        <p
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--weight-medium)',
            maxWidth: '70ch',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          {POSITIONING}
        </p>
      </Section>

      <FinalCta />
    </>
  );
}
