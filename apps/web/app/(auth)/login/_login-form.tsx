'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login, type LoginState } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary btn--lg" disabled={pending}>
      {pending ? 'Wird angemeldet…' : 'Anmelden'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<LoginState, FormData>(login, {});
  return (
    <form action={formAction} className="stack">
      {state.error && <div className="alert alert--danger">{state.error}</div>}
      <div className="field">
        <label htmlFor="email">E-Mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="name@garage.ch" />
      </div>
      <div className="field">
        <label htmlFor="password">Passwort</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
