import type { Metadata } from 'next';
import { BRAND } from '../../_content';

export const metadata: Metadata = {
  title: `Nutzungsbedingungen — ${BRAND.name}`,
  description: 'Nutzungsbedingungen / Terms of Service für Klarwerk (Entwurf).',
  alternates: { canonical: '/legal/terms' },
};

export default function TermsPage() {
  return (
    <section className="mk-section">
      <div className="mk-container mk-prose">
        <h1>Nutzungsbedingungen</h1>
        <p className="mk-todo">
          TODO LEGAL REVIEW — Entwurf. Vor Vertragsabschluss juristisch prüfen und finalisieren.
        </p>
        <p className="subtle">Stand: Entwurf · Pilotphase</p>

        <h2>1. Geltungsbereich</h2>
        <p>
          Diese Bedingungen regeln die Nutzung von {BRAND.name} („Dienst“) durch gewerbliche Kunden
          (Garagen, Werkstätten, Werkstattgruppen). Mit der Nutzung stimmen Sie diesen Bedingungen
          zu.
        </p>

        <h2>2. Leistungsbeschreibung</h2>
        <p>
          Der Dienst ermöglicht das Erstellen, Versenden und Dokumentieren digitaler Freigaben für
          Zusatzarbeiten. Der Funktionsumfang richtet sich nach dem gewählten Plan
          (<a href="/pricing">Preise</a>). Der Dienst befindet sich in der Pilotphase; Funktionen
          können sich weiterentwickeln.
        </p>

        <h2>3. Konten &amp; Rollen</h2>
        <p>
          Der Kunde ist für die Verwaltung seiner Nutzenden und deren Rollen verantwortlich sowie
          für die Vertraulichkeit der Zugangsdaten.
        </p>

        <h2>4. Pflichten des Kunden</h2>
        <ul>
          <li>Rechtmässige Nutzung, insbesondere gegenüber der eigenen Endkundschaft.</li>
          <li>Korrekte Angaben in Freigabeanfragen (Befund, Preisband, Empfehlung).</li>
          <li>Einhaltung der anwendbaren Datenschutzbestimmungen.</li>
        </ul>

        <h2>5. Preise &amp; Zahlung</h2>
        <p>
          Es gelten die zum Bestellzeitpunkt vereinbarten Preise. Die aktuell gezeigten Preise sind
          vorläufig (Draft, Pilotphase). Abrechnungsmodalitäten und Zahlungsanbieter werden vor
          kostenpflichtiger Nutzung festgelegt. <span className="mk-todo">TODO PROVIDER DECISION</span>
        </p>

        <h2>6. Laufzeit &amp; Kündigung</h2>
        <p>
          Abonnements sind – sofern nicht anders vereinbart – monatlich kündbar. Einzelheiten zu
          Upgrade, Downgrade und Kündigung werden im Bestellprozess geregelt.{' '}
          <span className="mk-todo">TODO</span>
        </p>

        <h2>7. Verfügbarkeit</h2>
        <p>
          Wir bemühen uns um eine hohe Verfügbarkeit, können in der Pilotphase jedoch keine
          bestimmte Verfügbarkeit garantieren. Wartungsfenster werden nach Möglichkeit angekündigt.
        </p>

        <h2>8. Haftung</h2>
        <p>
          Die Haftung richtet sich nach den gesetzlichen Bestimmungen; eine Beschränkung im gesetzlich
          zulässigen Rahmen bleibt vorbehalten. <span className="mk-todo">TODO LEGAL REVIEW</span>
        </p>

        <h2>9. Datenschutz</h2>
        <p>
          Es gilt ergänzend unsere <a href="/legal/privacy">Datenschutzerklärung</a>. Für die Daten
          der Endkundschaft handelt der Anbieter als Auftragsbearbeiter des Kunden.
        </p>

        <h2>10. Anwendbares Recht &amp; Gerichtsstand</h2>
        <p>
          Es gilt schweizerisches Recht; Gerichtsstand ist [Ort]. <span className="mk-todo">TODO</span>
        </p>

        <p className="subtle" style={{ marginTop: 32 }}>
          Dieser Text ist ein Entwurf und ersetzt keine Rechtsberatung.
        </p>
      </div>
    </section>
  );
}
