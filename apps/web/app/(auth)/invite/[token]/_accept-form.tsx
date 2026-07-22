'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { acceptInvite, type SimpleState } from '../../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary btn--lg" disabled={pending} aria-busy={pending}>
      {pending ? 'Wird eingerichtet…' : 'Zugang einrichten & starten'}
    </button>
  );
}

export function AcceptForm({ token }: { token: string }) {
  const action = acceptInvite.bind(null, token);
  const [state, formAction] = useFormState<SimpleState, FormData>(action, {});

  return (
    <form action={formAction} className="stack">
      {state.error && (
        <div className="alert alert--danger" role="alert">
          {state.error}
        </div>
      )}
      <div className="field">
        <label htmlFor="name">Ihr Name</label>
        <input id="name" name="name" type="text" autoComplete="name" placeholder="Vor- und Nachname" />
      </div>
      <div className="field">
        <label htmlFor="password">Passwort (min. 8 Zeichen)</label>
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
