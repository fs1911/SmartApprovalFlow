import { api, ApiClientError } from '@/lib/api';
import { TemplateEditor } from './_template-editor';

interface Template {
  id: string;
  key: string;
  channel: string;
  subject: string | null;
  body: string;
}

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  let templates: Template[] = [];
  let variables: string[] = [];
  let error: string | null = null;

  try {
    const res = await api.request<{ templates: Template[]; variables: string[] }>(
      '/api/v1/templates',
    );
    templates = res.templates;
    variables = res.variables;
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Einstellungen</h1>
          <p className="subtle">Nachrichtenvorlagen für Freigabe-Anfragen und Erinnerungen.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 16 }}>
          {error} — läuft die API unter <code>{api.base}</code>?
        </div>
      )}

      <div className="stack" style={{ maxWidth: 720 }}>
        {templates.length === 0 && !error ? (
          <div className="empty">
            <div className="empty__icon">✉️</div>
            <h2>Keine Vorlagen</h2>
            <p className="subtle">Führen Sie den Seed aus, um die Standardvorlagen anzulegen.</p>
          </div>
        ) : (
          templates.map((t) => (
            <TemplateEditor key={t.id} template={t} variables={variables} />
          ))
        )}
      </div>
    </>
  );
}
