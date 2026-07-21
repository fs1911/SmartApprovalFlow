import { redirect } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api';
import { getMe, can } from '@/lib/session';
import { MemberRow } from './_member-row';

interface Member {
  id: string;
  role: string;
  roleLabel: string;
  user: { name: string; email: string } | null;
}

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const me = await getMe();
  // Server-side guard: a role without members:read should not reach this page.
  if (!can(me, 'members:read')) redirect('/dashboard');
  const canManage = can(me, 'members:manage');

  let members: Member[] = [];
  let error: string | null = null;
  try {
    members = await api.request<Member[]>('/api/v1/members');
  } catch (e) {
    error = e instanceof ApiClientError ? e.message : 'API nicht erreichbar';
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p className="subtle">
            Mitglieder dieses Workspace und ihre Rollen.{' '}
            {canManage
              ? 'Sie können Rollen zuweisen.'
              : 'Nur Inhaber/Admin können Rollen ändern.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="case-list">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} canManage={canManage} />
        ))}
      </div>

      <p className="subtle" style={{ marginTop: 16 }}>
        Einladungen per E-Mail folgen in einem späteren Block. Rollen bestimmen, was ein Mitglied
        sehen und tun darf – siehe <code>docs/api-design.md</code>.
      </p>
    </>
  );
}
