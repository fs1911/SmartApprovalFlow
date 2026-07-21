import Link from 'next/link';
import { NavLink } from './_nav';
import { RoleSwitcher } from './_role-switcher';
import { getMe, can } from '@/lib/session';

/** Authenticated app shell: sidebar + topbar. Public pages don't use this. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const workspaceName = me?.tenant.slug ?? 'Workspace';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">S</span>
          <span>Smart Approval</span>
        </div>
        <nav className="sidebar__nav">
          <NavLink href="/dashboard">Übersicht</NavLink>
          <NavLink href="/approvals">Freigaben</NavLink>
          {can(me, 'reporting:read') && <NavLink href="/reporting">Auswertung</NavLink>}
          {can(me, 'members:read') && <NavLink href="/members">Team</NavLink>}
          <NavLink href="/settings">Einstellungen</NavLink>
        </nav>
        <div className="sidebar__foot">
          MVP · Block 4
          <br />
          Muster Garage AG
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="topbar__workspace">Muster Garage AG</span>
          <div className="row" style={{ alignItems: 'center', gap: 12 }}>
            {me && <span className="topbar__role">{me.roleLabel}</span>}
            <RoleSwitcher current={me?.role ?? 'OWNER'} />
            {can(me, 'cases:create') && (
              <Link href="/approvals/new" className="btn btn--primary">
                + Neue Freigabe
              </Link>
            )}
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
