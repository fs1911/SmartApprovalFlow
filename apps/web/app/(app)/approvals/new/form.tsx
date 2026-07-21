'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createApprovalCase, type CreateState } from './actions';

const initialState: CreateState = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Wird gespeichert…' : 'Freigabe anlegen'}
    </button>
  );
}

function FieldError({ errors, name }: { errors?: Record<string, string>; name: string }) {
  if (!errors?.[name]) return null;
  return <span className="error">{errors[name]}</span>;
}

export function CreateApprovalForm() {
  const [state, formAction] = useFormState(createApprovalCase, initialState);

  return (
    <form action={formAction}>
      {state.error && (
        <div className="alert alert--danger" style={{ marginBottom: 16 }}>
          {state.error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__body">
          <h2>Anliegen</h2>
          <div className="field">
            <label htmlFor="subject">
              Betreff <span className="required-mark">*</span>
            </label>
            <input id="subject" name="subject" placeholder="z. B. Bremsen hinten ersetzen" required />
            <FieldError errors={state.fieldErrors} name="subject" />
          </div>

          <div className="field">
            <label htmlFor="issueSummary">Festgestelltes Problem</label>
            <textarea
              id="issueSummary"
              name="issueSummary"
              placeholder="Was wurde festgestellt? In einfacher, kundenverständlicher Sprache."
            />
            <span className="hint">Erscheint für den Kunden — bitte klar und ohne Fachjargon.</span>
          </div>

          <div className="field">
            <label htmlFor="recommendationSummary">
              Empfohlene Arbeit <span className="required-mark">*</span>
            </label>
            <input
              id="recommendationSummary"
              name="recommendationSummary"
              placeholder="z. B. Bremsbeläge und -scheiben hinten ersetzen"
              required
            />
            <FieldError errors={state.fieldErrors} name="items.0.title" />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="priceMin">Preis von (CHF)</label>
              <input id="priceMin" name="priceMin" inputMode="decimal" placeholder="180.00" />
            </div>
            <div className="field">
              <label htmlFor="priceMax">Preis bis (CHF)</label>
              <input id="priceMax" name="priceMax" inputMode="decimal" placeholder="240.00" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="urgency">Dringlichkeit</label>
            <select id="urgency" name="urgency" defaultValue="MEDIUM">
              <option value="LOW">Niedrig — kann warten</option>
              <option value="MEDIUM">Mittel — bald empfohlen</option>
              <option value="HIGH">Hoch — sicherheitsrelevant</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__body">
          <h2>Kunde &amp; Fahrzeug</h2>
          <div className="field">
            <label htmlFor="customerName">
              Kundenname <span className="required-mark">*</span>
            </label>
            <input id="customerName" name="customerName" placeholder="Vor- und Nachname" required />
            <FieldError errors={state.fieldErrors} name="customer.name" />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="customerEmail">E-Mail</label>
              <input
                id="customerEmail"
                name="customerEmail"
                type="email"
                placeholder="kunde@example.ch"
              />
              <FieldError errors={state.fieldErrors} name="customer.email" />
            </div>
            <div className="field">
              <label htmlFor="customerPhone">Telefon</label>
              <input id="customerPhone" name="customerPhone" placeholder="+41 79 …" />
            </div>
          </div>
          <span className="hint" style={{ display: 'block', marginTop: -8, marginBottom: 12 }}>
            Mindestens E-Mail oder Telefon angeben — darüber erhält der Kunde den Link.
          </span>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="vehiclePlate">Kennzeichen</label>
              <input id="vehiclePlate" name="vehiclePlate" placeholder="ZH 123 456" />
            </div>
            <div className="field">
              <label htmlFor="vehicleMake">Marke</label>
              <input id="vehicleMake" name="vehicleMake" placeholder="VW" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="vehicleModel">Modell</label>
            <input id="vehicleModel" name="vehicleModel" placeholder="Golf" />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__body">
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              name="sendImmediately"
              style={{ width: 'auto', marginTop: 3 }}
            />
            <span>
              <strong>Sofort senden</strong>
              <br />
              <span className="subtle">
                Erzeugt direkt den sicheren Kundenlink. Andernfalls wird der Fall als Entwurf
                gespeichert.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="row">
        <SubmitButton />
        <a href="/approvals" className="btn btn--secondary">
          Abbrechen
        </a>
      </div>
    </form>
  );
}
