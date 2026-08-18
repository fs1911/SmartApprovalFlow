import type { Metadata } from 'next';
import { BRAND } from '../../_content';

export const metadata: Metadata = {
  title: `Impressum — ${BRAND.name}`,
  description: 'Impressum und Anbieterkennzeichnung von Klarwerk.',
  alternates: { canonical: '/legal/imprint' },
  robots: { index: true, follow: true },
};

export default function ImprintPage() {
  return (
    <section className="mk-section">
      <div className="mk-container mk-prose">
        <h1>Impressum</h1>
        <p className="mk-todo">TODO LEGAL REVIEW — Angaben vor Live-Gang vollständig ausfüllen und rechtlich prüfen lassen.</p>

        <h2>Anbieter</h2>
        <p>
          {BRAND.name}
          <br />
          [Firmenname / Rechtsform] <span className="mk-todo">TODO</span>
          <br />
          [Strasse Nr.], [PLZ Ort], Schweiz
        </p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: hallo@{BRAND.domain}
          <br />
          Telefon: [Telefonnummer] <span className="mk-todo">TODO</span>
        </p>

        <h2>Vertretungsberechtigte Person</h2>
        <p>[Name der vertretungsberechtigten Person] <span className="mk-todo">TODO</span></p>

        <h2>Handelsregister &amp; UID</h2>
        <p>
          Handelsregister: [Registergericht / Nummer] <span className="mk-todo">TODO</span>
          <br />
          Unternehmens-Identifikationsnummer (UID): [CHE-...] <span className="mk-todo">TODO</span>
          <br />
          MwSt-Nummer: [falls MwSt-pflichtig] <span className="mk-todo">TODO</span>
        </p>

        <h2>Verantwortlich für den Inhalt</h2>
        <p>[Name, Adresse] <span className="mk-todo">TODO</span></p>

        <h2>Haftungshinweis</h2>
        <p>
          Die Inhalte dieser Website werden mit Sorgfalt erstellt. Für Richtigkeit, Vollständigkeit
          und Aktualität wird keine Gewähr übernommen. Für Inhalte externer Links sind
          ausschliesslich deren Betreiber verantwortlich.
        </p>

        <p className="subtle" style={{ marginTop: 32 }}>
          Dieses Impressum ist ein Entwurf und ersetzt keine Rechtsberatung.
        </p>
      </div>
    </section>
  );
}
