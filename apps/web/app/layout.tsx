import type { Metadata } from 'next';
import '@saf/ui/tokens.css';
import './globals.css';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Smart Approval Flow — Digitale Freigaben für Werkstätten',
    template: '%s',
  },
  description:
    'Zusatzarbeiten digital freigeben lassen: sicherer Link mit Foto, Klartext und Preisband. ' +
    'Ihre Kundschaft entscheidet mobil – ohne App, ohne Login. Jede Freigabe dokumentiert.',
  applicationName: 'Smart Approval Flow',
  openGraph: {
    siteName: 'Smart Approval Flow',
    locale: 'de_CH',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
