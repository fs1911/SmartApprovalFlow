import type { Metadata } from 'next';
import { BRAND, SHORT_PITCH } from '../_content';
import { Eyebrow } from '../_components';
import { ContactForm } from './_contact-form';

export const metadata: Metadata = {
  title: `Demo & Kontakt — ${BRAND.name}`,
  description:
    'Fragen Sie eine Demo an oder sichern Sie sich Early Access. In der Pilotphase begleiten wir ' +
    'Sie persönlich beim Start mit digitalen Freigaben.',
  alternates: { canonical: '/demo' },
};

export default function DemoPage() {
  return (
    <section className="mk-section">
      <div className="mk-container">
        <div className="mk-grid--2 mk-grid" style={{ alignItems: 'start' }}>
          <div>
            <Eyebrow>Demo &amp; Kontakt</Eyebrow>
            <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>
              Sehen Sie den Ablauf an einem echten Beispiel.
            </h1>
            <p className="mk-lead" style={{ marginBottom: 'var(--space-5)' }}>
              {SHORT_PITCH}
            </p>
            <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
              <li>✓ 20-minütige Demo, an Ihrem Werkstattalltag ausgerichtet</li>
              <li>✓ Early-Access-Pilot mit persönlichem Onboarding</li>
              <li>✓ Keine Verpflichtung, keine Kreditkarte</li>
            </ul>
            <p className="subtle" style={{ marginTop: 'var(--space-6)' }}>
              Lieber direkt? Schreiben Sie an{' '}
              <a href={`mailto:hallo@${BRAND.domain}`}>hallo@{BRAND.domain}</a>.
              <br />
              <span className="mk-draft-note">TODO PROVIDER DECISION — Postfach/CRM anbinden</span>
            </p>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
