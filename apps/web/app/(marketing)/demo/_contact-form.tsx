'use client';

import { useState } from 'react';

/**
 * Contact / early-access form — placeholder flow.
 *
 * Block 5 has no real inbound provider yet (see docs/conversion-strategy.md).
 * The form validates client-side and shows a confirmation; wiring it to an
 * inbox / CRM / Resend is a Block 6 provider decision (TODO PROVIDER DECISION).
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <div className="mk-form">
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '2rem',
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              background: 'var(--color-success-50)',
              color: 'var(--color-success-500)',
            }}
          >
            ✓
          </div>
          <h2 style={{ marginBottom: 8 }}>Danke – wir melden uns.</h2>
          <p className="subtle">
            Ihre Anfrage ist bei uns notiert. In der Pilotphase melden wir uns persönlich, meist
            innerhalb eines Werktags.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="mk-form"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
        const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
        if (!name || !email) {
          setError('Bitte Name und E-Mail angeben.');
          return;
        }
        setError(null);
        // Placeholder: no backend submission in Block 5.
        setSent(true);
      }}
    >
      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}
      <div className="grid-2">
        <div className="field">
          <label htmlFor="name">Name *</label>
          <input id="name" name="name" required placeholder="Vor- und Nachname" />
        </div>
        <div className="field">
          <label htmlFor="company">Garage / Betrieb</label>
          <input id="company" name="company" placeholder="Muster Garage AG" />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="email">E-Mail *</label>
          <input id="email" name="email" type="email" required placeholder="name@garage.ch" />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefon</label>
          <input id="phone" name="phone" placeholder="+41 …" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="interest">Ich interessiere mich für</label>
        <select id="interest" name="interest" defaultValue="demo">
          <option value="demo">Eine Demo</option>
          <option value="early-access">Early Access / Pilot</option>
          <option value="pricing">Preise &amp; Pakete</option>
          <option value="partner">Partner / White-Label</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="message">Nachricht</label>
        <textarea
          id="message"
          name="message"
          placeholder="Kurz zu Ihrer Werkstatt und was Sie erreichen möchten."
        />
      </div>
      <button type="submit" className="btn btn--primary btn--lg" style={{ width: 'auto' }}>
        Anfrage senden
      </button>
      <p className="subtle" style={{ fontSize: 'var(--text-xs)', marginTop: 12 }}>
        Mit dem Absenden stimmen Sie der Bearbeitung Ihrer Angaben zur Kontaktaufnahme zu. Siehe{' '}
        <a href="/legal/privacy">Datenschutz</a>.
      </p>
    </form>
  );
}
