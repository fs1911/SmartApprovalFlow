import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '../../_auth-shell';
import { AcceptForm } from './_accept-form';

export const metadata: Metadata = {
  title: 'Einladung annehmen — Klarwerk',
  robots: { index: false, follow: false },
};

export default function InvitePage({ params }: { params: { token: string } }) {
  return (
    <AuthShell
      title="Willkommen im Team"
      footer={<Link href="/login">Bereits ein Konto? Anmelden</Link>}
    >
      <p className="subtle" style={{ marginBottom: 'var(--space-4)' }}>
        Richten Sie Ihren Zugang ein, um Freigaben zu bearbeiten.
      </p>
      <AcceptForm token={params.token} />
    </AuthShell>
  );
}
