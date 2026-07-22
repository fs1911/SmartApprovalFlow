'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { requestPasswordReset, type SimpleState } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary btn--lg" disabled={pending} aria-busy={pending}>
      {pending ? 'Wird gesendet…' : 'Link anfordern'}
    </button>
  );
}

export function ForgotForm() {
  const [state, formAction] = useFormState<SimpleState, FormData>(requestPasswordReset, {});

  if (state.ok) {
    return (
      <div className="alert alert--success" role="status">
        Falls ein Konto existiert, ist eine E-Mail mit dem Link unterwegs. Prüfen Sie Ihr Postfach.
      </div>
    );
  }

  return (
    <form action={formAction} className="stack">
      {state.error && (
        <div className="alert alert--danger" role="alert">
          {state.error}
        </div>
      )}
      <div className="field">
        <label htmlFor="email">E-Mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="name@garage.ch" />
      </div>
      <SubmitButton />
    </form>
  );
}
