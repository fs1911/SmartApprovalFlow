import type { Metadata } from 'next';
import { BRAND } from '../_content';
import { Section, Eyebrow, FinalCta } from '../_components';

export const metadata: Metadata = {
  title: `Für Garagen & Werkstätten — ${BRAND.name}`,
  description:
    'Für unabhängige Garagen, kleine Werkstattgruppen und Serviceberater: mehr freigegebene ' +
    'Zusatzarbeiten, weniger Nachtelefonieren, belegbare Entscheidungen. Ohne Systemwechsel.',
  alternates: { canonical: '/for-garages' },
};

export default function ForGaragesPage() {
  return (
    <>
      <section className="mk-hero">
        <div className="mk-container">
          <Eyebrow>Für Garagen &amp; Werkstätten</Eyebrow>
          <h1>Gemacht für den Werkstattalltag – nicht fürs Büro.</h1>
          <p className="mk-hero__sub">
            Für unabhängige Garagen, kleine Werkstattgruppen und Serviceberater, die
            Zusatzarbeiten schneller und sauberer freigeben lassen wollen – ohne schwerfälliges
            System.
          </p>
        </div>
      </section>

      <Section>
        <Eyebrow>Ein Tag in der Annahme</Eyebrow>
        <h2>Der Unterschied im Alltag.</h2>
        <div className="mk-grid--2 mk-grid" style={{ marginTop: 'var(--space-6)' }}>
          <div className="mk-feature">
            <h3>Vorher</h3>
            <p>
              Kunde nicht erreichbar. Fahrzeug steht. Zusatzarbeit wird mündlich zugesagt – oder
              geht ganz verloren. Bei der Rechnung: Diskussion ohne Beleg.
            </p>
          </div>
          <div className="mk-feature">
            <h3>Mit Klarwerk</h3>
            <p>
              Ein Link mit Foto und Preisband ist in einer Minute gesendet. Die Kundschaft
              entscheidet mobil. Ihr Team sieht den Status live – und hat den Nachweis.
            </p>
          </div>
        </div>
      </Section>

      <Section muted>
        <Eyebrow>Wen es weiterbringt</Eyebrow>
        <h2>Passt zu Ihrer Rolle.</h2>
        <div className="mk-grid" style={{ marginTop: 'var(--space-6)' }}>
          <div className="mk-feature">
            <h3>Inhaber:in</h3>
            <p>Mehr Zusatzumsatz, weniger Reibung, klare Nachvollziehbarkeit über alle Fälle.</p>
          </div>
          <div className="mk-feature">
            <h3>Serviceberater:in</h3>
            <p>Schnell erfassen, senden, erinnern – und in Echtzeit sehen, wer reagiert hat.</p>
          </div>
          <div className="mk-feature">
            <h3>Werkstattgruppe</h3>
            <p>Mehrere Standorte, zentrale Rollen und einheitliche, professionelle Kundenerlebnisse.</p>
          </div>
        </div>
      </Section>

      <Section>
        <Eyebrow>Bewusst schlank</Eyebrow>
        <h2>Ein Layer, kein Systemwechsel.</h2>
        <p className="mk-lead">
          Klarwerk ersetzt Ihre Werkstattsoftware nicht. Es ergänzt genau den fehlenden
          Baustein – die digitale, belegbare Kundenfreigabe – und lässt sich später über eine
          API anbinden.
        </p>
      </Section>

      <FinalCta />
    </>
  );
}
