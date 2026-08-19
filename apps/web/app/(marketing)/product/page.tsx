import type { Metadata } from 'next';
import { STEPS, BENEFITS, BRAND } from '../_content';
import { Section, Eyebrow, FinalCta } from '../_components';

export const metadata: Metadata = {
  title: `Wie es funktioniert — ${BRAND.name}`,
  description:
    'Vom Befund zur dokumentierten Freigabe: Fall anlegen, sicheren Link senden, Kunde entscheidet ' +
    'mobil, Status live sehen. So arbeitet Nicka im Werkstattalltag.',
  alternates: { canonical: '/product' },
};

export default function ProductPage() {
  return (
    <>
      <section className="mk-hero">
        <div className="mk-container">
          <Eyebrow>Produkt</Eyebrow>
          <h1>Von der Diagnose zur dokumentierten Freigabe.</h1>
          <p className="mk-hero__sub">
            Nicka begleitet genau den Moment, in dem am Fahrzeug etwas Zusätzliches
            auffällt – und macht daraus eine klare, belegbare Kundenentscheidung.
          </p>
        </div>
      </section>

      <Section>
        <div className="mk-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="mk-step">
              <div className="mk-step__n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section muted>
        <Eyebrow>Was die Kundenseite ausmacht</Eyebrow>
        <h2>Kundennah, nicht technisch.</h2>
        <div className="mk-grid--2 mk-grid" style={{ marginTop: 'var(--space-6)' }}>
          <div className="mk-feature">
            <h3>Verständliche Sprache</h3>
            <p>
              Befund und Empfehlung in Klartext, nicht in Werkstatt-Jargon – mit Foto und klarem
              Preisband. Die Kundschaft versteht in Sekunden, worum es geht.
            </p>
          </div>
          <div className="mk-feature">
            <h3>Drei klare Optionen</h3>
            <p>Freigeben, ablehnen oder Rückruf wünschen – eine eindeutige Handlungsführung.</p>
          </div>
          <div className="mk-feature">
            <h3>Ihr Branding</h3>
            <p>
              Die Freigabeseite trägt Namen, Farbe und Kontakt Ihrer Werkstatt – vertrauenswürdig
              und wiedererkennbar.
            </p>
          </div>
          <div className="mk-feature">
            <h3>Sicherer, ablaufender Link</h3>
            <p>Unguessbarer Token, zeitlich begrenzt – kein Login, kein Konto, kein Risiko.</p>
          </div>
        </div>
      </Section>

      <Section>
        <Eyebrow>Für Ihr Team</Eyebrow>
        <h2>Überblick und Nachweis an einem Ort.</h2>
        <div className="mk-grid" style={{ marginTop: 'var(--space-6)' }}>
          {BENEFITS.slice(0, 3).map((b) => (
            <div key={b.title} className="mk-feature">
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </div>
          ))}
        </div>
        <p className="subtle" style={{ marginTop: 'var(--space-5)' }}>
          Jede Aktion – gesendet, geöffnet, erinnert, entschieden – landet in einem
          revisionssicheren Verlauf. Rollen und Rechte stellen sicher, dass jede Person genau das
          sieht und tut, was sie darf.
        </p>
      </Section>

      <FinalCta />
    </>
  );
}
