import Link from 'next/link';
import { NavLink } from './_nav';

/** Authenticated app shell: sidebar + topbar. Public pages don't use this. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
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
          <NavLink href="/settings">Einstellungen</NavLink>
        </nav>
        <div className="sidebar__foot">
          MVP · Block 2
          <br />
          Muster Garage AG
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="topbar__workspace">Muster Garage AG</span>
          <div className="row" style={{ alignItems: 'center', gap: 12 }}>
            <span className="topbar__role">Service Advisor</span>
            <Link href="/approvals/new" className="btn btn--primary">
              + Neue Freigabe
            </Link>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
