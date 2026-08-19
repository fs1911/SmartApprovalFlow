import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '../_auth-shell';
import { ForgotForm } from './_forgot-form';

export const metadata: Metadata = {
  title: 'Passwort vergessen — Nicka',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Passwort vergessen" footer={<Link href="/login">← Zurück zur Anmeldung</Link>}>
      <p className="subtle" style={{ marginBottom: 'var(--space-4)' }}>
        Geben Sie Ihre E-Mail-Adresse ein. Falls ein Konto existiert, senden wir Ihnen einen Link
        zum Zurücksetzen.
      </p>
      <ForgotForm />
    </AuthShell>
  );
}
