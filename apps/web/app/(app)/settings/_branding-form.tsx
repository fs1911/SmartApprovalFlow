'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveWorkspace, type WorkspaceSaveState } from './actions';

interface Workspace {
  name: string;
  brandName: string | null;
  brandColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn--primary" disabled={pending} type="submit">
      {pending ? 'Wird gespeichert…' : 'Branding speichern'}
    </button>
  );
}

export function BrandingForm({ workspace }: { workspace: Workspace }) {
  const [state, formAction] = useFormState<WorkspaceSaveState, FormData>(saveWorkspace, {});

  return (
    <form action={formAction}>
      {state.ok && <div className="alert alert--success">Branding gespeichert.</div>}
      {state.error && <div className="alert alert--danger">{state.error}</div>}

      <div className="grid-2">
        <div className="field">
          <label htmlFor="name">Firmenname</label>
          <input id="name" name="name" defaultValue={workspace.name} />
        </div>
        <div className="field">
          <label htmlFor="brandName">Anzeigename (Kundenseite)</label>
          <input id="brandName" name="brandName" defaultValue={workspace.brandName ?? ''} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="brandColor">Markenfarbe</label>
        <div className="row" style={{ alignItems: 'center' }}>
          <input
            type="color"
            defaultValue={workspace.brandColor ?? '#1f5fa8'}
            onChange={(e) => {
              const t = document.getElementById('brandColor') as HTMLInputElement | null;
              if (t) t.value = e.target.value;
            }}
            style={{ width: 48, padding: 2 }}
            aria-label="Farbe wählen"
          />
          <input
            id="brandColor"
            name="brandColor"
            defaultValue={workspace.brandColor ?? '#1f5fa8'}
            placeholder="#1f5fa8"
            style={{ maxWidth: 160 }}
          />
        </div>
        <span className="hint">Akzentfarbe auf der öffentlichen Kundenseite.</span>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="contactEmail">Kontakt-E-Mail (Kundenseite)</label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={workspace.contactEmail ?? ''}
          />
        </div>
        <div className="field">
          <label htmlFor="contactPhone">Kontakt-Telefon (Kundenseite)</label>
          <input id="contactPhone" name="contactPhone" defaultValue={workspace.contactPhone ?? ''} />
        </div>
      </div>

      <SaveButton />
    </form>
  );
}
