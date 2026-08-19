import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '../../_auth-shell';
import { ResetForm } from './_reset-form';

export const metadata: Metadata = {
  title: 'Neues Passwort setzen — Nicka',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  return (
    <AuthShell title="Neues Passwort setzen" footer={<Link href="/login">← Zurück zur Anmeldung</Link>}>
      <ResetForm token={params.token} />
    </AuthShell>
  );
}
