import type { Metadata } from 'next';
import { BRAND } from '../../_content';

export const metadata: Metadata = {
  title: `Datenschutzerklärung — ${BRAND.name}`,
  description: 'Wie Klarwerk personenbezogene Daten bearbeitet (Entwurf).',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <section className="mk-section">
      <div className="mk-container mk-prose">
        <h1>Datenschutzerklärung</h1>
        <p className="mk-todo">
          TODO LEGAL REVIEW — Entwurf. Vor Live-Gang durch Fachperson prüfen (revDSG Schweiz, ggf.
          DSGVO bei EU-Bezug).
        </p>
        <p className="subtle">Stand: Entwurf · Pilotphase</p>

        <h2>1. Verantwortliche Stelle</h2>
        <p>
          Verantwortlich für die Datenbearbeitung ist der im <a href="/legal/imprint">Impressum</a>{' '}
          genannte Anbieter von {BRAND.name}.
        </p>

        <h2>2. Welche Daten wir bearbeiten</h2>
        <ul>
          <li>
            <strong>Werkstatt-Nutzende:</strong> Name, E-Mail, Rolle, Workspace-Zugehörigkeit sowie
            die im Betrieb erfassten Falldaten.
          </li>
          <li>
            <strong>Endkundschaft der Werkstatt:</strong> Name, Kontaktangaben (E-Mail/Telefon),
            Fahrzeugbezug, Freigabeentscheidung sowie technische Angaben (z. B. Zeitstempel) zur
            Nachvollziehbarkeit der Freigabe.
          </li>
          <li>
            <strong>Website-Besuchende:</strong> im Rahmen von Kontakt-/Demo-Anfragen freiwillig
            übermittelte Angaben.
          </li>
        </ul>

        <h2>3. Zwecke &amp; Grundlagen</h2>
        <p>
          Die Bearbeitung erfolgt zur Bereitstellung des Dienstes (digitale Freigaben), zur
          Kommunikation, zur revisionssicheren Dokumentation von Entscheidungen sowie zur
          Vertragsabwicklung. Es gilt der Grundsatz der Datenminimierung: Die öffentliche
          Freigabeseite zeigt nur freigaberelevante Informationen.
        </p>

        <h2>4. Auftragsbearbeitung</h2>
        <p>
          Für Werkstätten agiert {BRAND.name} als Auftragsbearbeiter hinsichtlich der Daten ihrer
          Endkundschaft. Ein Auftragsbearbeitungsvertrag (DPA) wird bereitgestellt.{' '}
          <span className="mk-todo">TODO LEGAL REVIEW</span>
        </p>

        <h2>5. Hosting &amp; Dienstleister</h2>
        <p>
          Betrieb und Datenspeicherung erfolgen bei sorgfältig ausgewählten Dienstleistern. Konkrete
          Anbieter (Hosting, E-Mail-Versand) werden mit dem produktiven Betrieb festgelegt.{' '}
          <span className="mk-todo">TODO PROVIDER DECISION</span>
        </p>

        <h2>6. Aufbewahrung</h2>
        <p>
          Falldaten und Freigabenachweise werden so lange aufbewahrt, wie es für die
          Nachvollziehbarkeit und gesetzliche Pflichten erforderlich ist. Danach werden sie gelöscht
          oder anonymisiert. <span className="mk-todo">TODO — Fristen festlegen</span>
        </p>

        <h2>7. Ihre Rechte</h2>
        <p>
          Sie haben Rechte auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit im Rahmen
          der geltenden Gesetze. Anfragen richten Sie an{' '}
          <a href={`mailto:datenschutz@${BRAND.domain}`}>datenschutz@{BRAND.domain}</a>.
        </p>

        <h2>8. Cookies &amp; Tracking</h2>
        <p>
          Diese Website verwendet in der Pilotphase nur technisch notwendige Mechanismen und keine
          Marketing-Tracker. Ein Cookie-/Tracking-Konzept wird bei Einführung von Analytics ergänzt.{' '}
          <span className="mk-todo">TODO — Cookie-Konzept</span>
        </p>

        <p className="subtle" style={{ marginTop: 32 }}>
          Dieser Text ist ein Entwurf und ersetzt keine Rechtsberatung.
        </p>
      </div>
    </section>
  );
}
