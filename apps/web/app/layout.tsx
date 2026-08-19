import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Newsreader } from 'next/font/google';
import '@saf/ui/tokens.css';
import './globals.css';
import { SITE_URL } from '@/lib/site';

// Body text: Inter (the tokens already assume it) — now actually loaded.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Display / headings: Space Grotesk — geometric, technical, distinctive; gives
// the brand a considered, non-generic voice without being flashy (Block 47).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
  variable: '--font-display-face',
});

// Serif for marketing sublines/quotes — an elegant counterpoint to the bold
// display sans (Beagle-inspired pairing, Block 47).
const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  weight: ['400', '500'],
  variable: '--font-serif-face',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Klarwerk — Digitale Freigaben für Werkstätten',
    template: '%s',
  },
  description:
    'Zusatzarbeiten digital freigeben lassen: sicherer Link mit Foto, Klartext und Preisband. ' +
    'Ihre Kundschaft entscheidet mobil – ohne App, ohne Login. Jede Freigabe dokumentiert.',
  applicationName: 'Klarwerk',
  openGraph: {
    siteName: 'Klarwerk',
    locale: 'de_CH',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${spaceGrotesk.variable} ${newsreader.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
