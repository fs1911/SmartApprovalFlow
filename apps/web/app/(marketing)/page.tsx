import type { Metadata } from 'next';
import Link from 'next/link';
import { HERO, BENEFITS, STEPS, BRAND, POSITIONING } from './_content';
import { Section, Eyebrow, CtaRow, FinalCta } from './_components';

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
        <div className="mk-container">
          <Eyebrow>Für unabhängige Garagen &amp; Werkstätten</Eyebrow>
          <h1>{HERO.headline}</h1>
          <p className="mk-hero__sub">{HERO.subline}</p>
          <CtaRow primary={HERO.primaryCta} secondary={HERO.secondaryCta} />
          <div className="mk-hero__trust">
            <span>🔒 Ohne App &amp; ohne Login</span>
            <span>📄 Revisionssicher dokumentiert</span>
            <span>⚡ In einem Tag startklar</span>
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

      {/* How it works */}
      <Section>
        <Eyebrow>So funktioniert es</Eyebrow>
        <h2>In vier Schritten zur dokumentierten Freigabe.</h2>
        <div className="mk-steps" style={{ marginTop: 'var(--space-6)' }}>
          {STEPS.map((s) => (
            <div key={s.n} className="mk-step">
              <div className="mk-step__n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Link href="/product">Ausführlich ansehen →</Link>
        </div>
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
