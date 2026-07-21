'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendCase, remindCase, type ActionResult } from './actions';

/**
 * Send / reminder controls. Which action is offered depends on the case status:
 *  - DRAFT               -> "Anfrage senden"
 *  - SENT/VIEWED/CALLBACK -> "Erinnerung senden"
 *  - terminal            -> nothing (handled by parent)
 */
export function CaseActions({ caseId, status }: { caseId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const isDraft = status === 'DRAFT';
  const isPending = ['SENT', 'VIEWED', 'CALLBACK'].includes(status);

  function run(fn: (id: string) => Promise<ActionResult>) {
    setResult(null);
    startTransition(async () => {
      const res = await fn(caseId);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="stack">
      {result?.ok && result.message && <div className="alert alert--success">{result.message}</div>}
      {result && !result.ok && <div className="alert alert--danger">{result.error}</div>}

      {isDraft && (
        <>
          <p className="subtle">
            Sendet die Anfrage per E-Mail an den Kunden und erzeugt den sicheren Link.
          </p>
          <button
            className="btn btn--primary"
            disabled={pending}
            onClick={() => run(sendCase)}
            type="button"
          >
            {pending ? 'Wird gesendet…' : 'Anfrage an Kunde senden'}
          </button>
        </>
      )}

      {isPending && (
        <>
          <p className="subtle">Der Kunde hat noch nicht final entschieden.</p>
          <button
            className="btn btn--secondary"
            disabled={pending}
            onClick={() => run(remindCase)}
            type="button"
          >
            {pending ? 'Wird gesendet…' : 'Erinnerung senden'}
          </button>
        </>
      )}
    </div>
  );
}
