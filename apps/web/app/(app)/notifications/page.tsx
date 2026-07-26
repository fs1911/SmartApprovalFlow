import { api, ApiClientError } from '@/lib/api';
import { NotificationList, type NotificationRow } from './_list';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  let items: NotificationRow[] = [];
  let error: string | null = null;
  try {
    items = await api.request<NotificationRow[]>('/api/v1/notifications?limit=50');
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Benachrichtigungen</h1>
          <p className="subtle">Kundenreaktionen, Zuweisungen und interne Notizen.</p>
        </div>
      </div>

      {error && <div className="alert alert--danger" style={{ marginBottom: 16 }}>{error}</div>}

      <NotificationList items={items} />
    </>
  );
}
