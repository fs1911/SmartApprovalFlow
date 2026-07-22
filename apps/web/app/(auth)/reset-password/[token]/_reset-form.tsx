'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { resetPassword, type SimpleState } from '../../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary btn--lg" disabled={pending} aria-busy={pending}>
      {pending ? 'Wird gespeichert…' : 'Passwort speichern'}
    </button>
  );
}

export function ResetForm({ token }: { token: string }) {
  const action = resetPassword.bind(null, token);
  const [state, formAction] = useFormState<SimpleState, FormData>(action, {});

  if (state.ok) {
    return (
      <div className="stack">
        <div className="alert alert--success" role="status">
          Ihr Passwort wurde gesetzt. Sie können sich jetzt anmelden.
        </div>
        <Link href="/login" className="btn btn--primary btn--lg">
          Zur Anmeldung
        </Link>
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
        <label htmlFor="password">Neues Passwort (min. 8 Zeichen)</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="••••••••"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
