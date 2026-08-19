import type { Metadata } from 'next';
import { BRAND } from '../_content';
import { Section, Eyebrow, FinalCta } from '../_components';

export const metadata: Metadata = {
  title: `Sicherheit & Datenschutz — ${BRAND.name}`,
  description:
    'Wie Nicka mit Sicherheit und Datenschutz umgeht: sichere Links, ' +
    'Datenminimierung auf der Kundenseite, revisionssicherer Audit-Trail, tenant-getrennte Daten.',
  alternates: { canonical: '/security' },
};

export default function SecurityPage() {
  return (
    <>
      <section className="mk-hero">
        <div className="mk-container">
          <Eyebrow>Sicherheit &amp; Vertrauen</Eyebrow>
          <h1>Vertrauen ist das Produkt – nicht nur ein Feature.</h1>
          <p className="mk-hero__sub">
            Nicka ist so gebaut, dass Kundendaten sparsam behandelt und Entscheidungen
            belegbar dokumentiert werden.
          </p>
        </div>
      </section>

      <Section>
        <div className="mk-grid">
          <div className="mk-feature">
            <h3>Sichere, ablaufende Links</h3>
            <p>
              Kundenlinks basieren auf unguessbaren Tokens; gespeichert wird nur deren Hash. Links
              sind zeitlich begrenzt und können zurückgezogen werden.
            </p>
          </div>
          <div className="mk-feature">
            <h3>Datenminimierung by design</h3>
            <p>
              Die öffentliche Freigabeseite zeigt ausschliesslich freigaberelevante Informationen –
              keine internen Notizen, keine anderen Fälle.
            </p>
          </div>
          <div className="mk-feature">
            <h3>Revisionssicherer Verlauf</h3>
            <p>
              Jede Aktion – gesendet, geöffnet, erinnert, entschieden – wird mit Zeitstempel
              protokolliert und ist nachvollziehbar.
            </p>
          </div>
          <div className="mk-feature">
            <h3>Getrennte Mandanten</h3>
            <p>
              Jede Werkstatt ist ein eigener Workspace. Zugriffe werden pro Workspace und Rolle
              geprüft; Fremdzugriff wird unterbunden.
            </p>
          </div>
          <div className="mk-feature">
            <h3>Rollen &amp; Rechte</h3>
            <p>
              Klar definierte Rollen (Inhaber, Admin, Berater, Techniker, Betrachter) steuern, wer
              was sehen und tun darf.
            </p>
          </div>
          <div className="mk-feature">
            <h3>Ohne Login für Kundschaft</h3>
            <p>
              Kein Konto, kein Download – geringere Angriffsfläche und höhere Akzeptanz bei der
              Endkundschaft.
            </p>
          </div>
        </div>
      </Section>

      <Section muted>
        <Eyebrow>Transparenz</Eyebrow>
        <h2>Was noch in Arbeit ist.</h2>
        <p className="mk-lead">
          Nicka ist in der Pilotphase. Formale Zusicherungen wie
          Auftragsbearbeitungsvertrag (DPA), Hosting-Standort-Garantien und externe Zertifizierungen
          werden mit dem produktiven Betrieb finalisiert.{' '}
          <span className="mk-todo">TODO LEGAL REVIEW</span>
        </p>
        <p className="subtle" style={{ marginTop: 'var(--space-4)' }}>
          Details zur Datenbearbeitung finden Sie in der{' '}
          <a href="/legal/privacy">Datenschutzerklärung</a>. Fragen zur Sicherheit? Schreiben Sie an{' '}
          <a href={`mailto:security@${BRAND.domain}`}>security@{BRAND.domain}</a>.
        </p>
      </Section>

      <FinalCta />
    </>
  );
}
