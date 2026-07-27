import { api, ApiClientError } from '@/lib/api';
import { getMe, can } from '@/lib/session';
import { TemplateEditor } from './_template-editor';
import { BrandingForm } from './_branding-form';
import { PlanPanel, type BillingData } from './_plan-panel';
import { DeveloperPanel, type DeveloperData } from './_developer-panel';

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

interface AdminOverview {
  members: number;
  pendingInvites: number;
  customers: number;
  cases: { total: number; byStatus: Record<string, number> };
  storage: { attachments: number; bytes: number };
  plan: { key: string; label: string; status: string };
  retention: { caseMonths: number; webhookDays: number; note: string };
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const me = await getMe();
  const canBrand = can(me, 'workspace:manage');
  const canEditTemplates = can(me, 'templates:write');

  const canWorkspaceRead = can(me, 'workspace:read');
  const canManageMembers = can(me, 'members:manage');

  let templates: Template[] = [];
  let variables: string[] = [];
  let workspace: Workspace | null = null;
  let billing: BillingData | null = null;
  let developer: DeveloperData | null = null;
  let admin: AdminOverview | null = null;
  let error: string | null = null;

  try {
    const [tpl, ws, bill, keys, hooks, ov] = await Promise.all([
      api.request<{ templates: Template[]; variables: string[] }>('/api/v1/templates'),
      canBrand ? api.request<Workspace>('/api/v1/workspace') : Promise.resolve(null),
      canWorkspaceRead ? api.request<BillingData>('/api/v1/billing') : Promise.resolve(null),
      canManageMembers
        ? api.request<{ keys: DeveloperData['apiKeys']; availableScopes: string[] }>('/api/v1/api-keys')
        : Promise.resolve(null),
      canManageMembers
        ? api.request<{ endpoints: DeveloperData['webhooks']; availableEvents: string[] }>('/api/v1/webhook-endpoints')
        : Promise.resolve(null),
      canManageMembers ? api.request<AdminOverview>('/api/v1/admin/overview') : Promise.resolve(null),
    ]);
    templates = tpl.templates;
    variables = tpl.variables;
    workspace = ws;
    billing = bill;
    admin = ov;
    if (keys && hooks) {
      developer = {
        apiKeys: keys.keys,
        availableScopes: keys.availableScopes,
        webhooks: hooks.endpoints,
        availableEvents: hooks.availableEvents,
      };
    }
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
        {admin && (
          <div className="card">
            <div className="card__body">
              <h2>Admin-Überblick</h2>
              <dl className="dl">
                <dt>Mitglieder</dt>
                <dd>{admin.members}{admin.pendingInvites > 0 ? ` (+${admin.pendingInvites} eingeladen)` : ''}</dd>
                <dt>Kund:innen</dt>
                <dd>{admin.customers}</dd>
                <dt>Fälle gesamt</dt>
                <dd>{admin.cases.total}</dd>
                <dt>Fotos / Speicher</dt>
                <dd>{admin.storage.attachments} · {fmtBytes(admin.storage.bytes)}</dd>
                <dt>Plan</dt>
                <dd>{admin.plan.label} ({admin.plan.status})</dd>
                <dt>Aufbewahrung</dt>
                <dd>{admin.retention.note}</dd>
              </dl>
              <p className="subtle" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                Daten-Export und Löschung einzelner Fälle finden Sie auf der jeweiligen Fall-Detailseite.
              </p>
            </div>
          </div>
        )}

        {billing && <PlanPanel data={billing} canManage={canBrand} />}

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

        {developer && <DeveloperPanel data={developer} />}
      </div>
    </>
  );
}
