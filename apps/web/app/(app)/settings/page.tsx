import { api, ApiClientError } from '@/lib/api';
import { getMe, can } from '@/lib/session';
import { TemplateEditor } from './_template-editor';
import { BrandingForm } from './_branding-form';

interface Template {
  id: string;
  key: string;
  channel: string;
  subject: string | null;
  body: string;
}

interface Workspace {
  name: string;
  brandName: string | null;
  brandColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const me = await getMe();
  const canBrand = can(me, 'workspace:manage');
  const canEditTemplates = can(me, 'templates:write');

  let templates: Template[] = [];
  let variables: string[] = [];
  let workspace: Workspace | null = null;
  let error: string | null = null;

  try {
    const [tpl, ws] = await Promise.all([
      api.request<{ templates: Template[]; variables: string[] }>('/api/v1/templates'),
      canBrand ? api.request<Workspace>('/api/v1/workspace') : Promise.resolve(null),
    ]);
    templates = tpl.templates;
    variables = tpl.variables;
    workspace = ws;
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Einstellungen</h1>
          <p className="subtle">Branding und Nachrichtenvorlagen für Ihren Workspace.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 16 }}>
          {error} — läuft die API unter <code>{api.base}</code>?
        </div>
      )}

      <div className="stack" style={{ maxWidth: 720 }}>
        {canBrand && workspace && (
          <div className="card">
            <div className="card__body">
              <h2>Branding &amp; White-Label</h2>
              <p className="subtle" style={{ marginTop: -4, marginBottom: 12 }}>
                Diese Angaben erscheinen auf der öffentlichen Kundenseite.
              </p>
              <BrandingForm workspace={workspace} />
            </div>
          </div>
        )}

        <h2 style={{ marginTop: 8 }}>Nachrichtenvorlagen</h2>
        {!canEditTemplates && (
          <div className="alert alert--info">
            Sie können Vorlagen ansehen. Zum Bearbeiten ist die Rolle Inhaber/Admin nötig.
          </div>
        )}
        {templates.map((t) => (
          <TemplateEditor
            key={t.id}
            template={t}
            variables={variables}
            readOnly={!canEditTemplates}
          />
        ))}
      </div>
    </>
  );
}
