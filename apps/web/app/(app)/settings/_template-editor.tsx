'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveTemplate, type TemplateSaveState } from './actions';

interface Template {
  id: string;
  key: string;
  channel: string;
  subject: string | null;
  body: string;
}

const KEY_LABELS: Record<string, string> = {
  approval_request_email: 'Freigabe-Anfrage (E-Mail)',
  approval_reminder_email: 'Erinnerung (E-Mail)',
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn--primary" disabled={pending} type="submit">
      {pending ? 'Wird gespeichert…' : 'Speichern'}
    </button>
  );
}

export function TemplateEditor({
  template,
  variables,
}: {
  template: Template;
  variables: readonly string[];
}) {
  const [state, formAction] = useFormState<TemplateSaveState, FormData>(saveTemplate, {});

  return (
    <div className="card">
      <div className="card__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{KEY_LABELS[template.key] ?? template.key}</h2>
          <span className="badge badge--neutral">{template.channel}</span>
        </div>

        <form action={formAction} style={{ marginTop: 16 }}>
          <input type="hidden" name="id" value={template.id} />

          {state.ok && <div className="alert alert--success">Vorlage gespeichert.</div>}
          {state.error && <div className="alert alert--danger">{state.error}</div>}

          <div className="field">
            <label htmlFor={`subject-${template.id}`}>Betreff</label>
            <input
              id={`subject-${template.id}`}
              name="subject"
              defaultValue={template.subject ?? ''}
            />
          </div>
          <div className="field">
            <label htmlFor={`body-${template.id}`}>Nachrichtentext</label>
            <textarea
              id={`body-${template.id}`}
              name="body"
              defaultValue={template.body}
              style={{ minHeight: 180, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}
            />
          </div>

          <div className="field">
            <span className="hint">
              Verfügbare Platzhalter:{' '}
              {variables.map((v) => (
                <code key={v} style={{ marginRight: 6 }}>{`{{${v}}}`}</code>
              ))}
            </span>
          </div>

          <SaveButton />
        </form>
      </div>
    </div>
  );
}
