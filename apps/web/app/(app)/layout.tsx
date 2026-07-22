import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NavLink } from './_nav';
import { RoleSwitcher } from './_role-switcher';
import { getMe, can } from '@/lib/session';
import { logout } from '../(auth)/actions';

/** Authenticated app shell: sidebar + topbar. Public pages don't use this. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  // Real auth guard: no valid session → go to login. (In development the API's
  // dev-header fallback keeps getMe() populated, so local work is unaffected.)
  if (!me) redirect('/login');

  const isDev = process.env.NODE_ENV !== 'production';

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
          MVP · Block 7
          <br />
          {me.tenant.slug}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="topbar__workspace">{me.user?.name ?? me.tenant.slug}</span>
          <div className="row" style={{ alignItems: 'center', gap: 12 }}>
            {me && <span className="topbar__role">{me.roleLabel}</span>}
            {isDev && <RoleSwitcher current={me.role ?? 'OWNER'} />}
            {can(me, 'cases:create') && (
              <Link href="/approvals/new" className="btn btn--primary">
                + Neue Freigabe
              </Link>
            )}
            <form action={logout}>
              <button type="submit" className="btn btn--secondary" style={{ padding: '8px 14px' }}>
                Abmelden
              </button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
