import type { Metadata } from 'next';
import '@saf/ui/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Approval Flow',
  description: 'Digitale Freigaben für Werkstätten — schnell, klar, revisionssicher.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
