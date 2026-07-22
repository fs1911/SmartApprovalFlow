/**
 * Marketing content — the single source of truth for the public site's copy.
 *
 * Keeping messaging here (rather than scattered in JSX) means the positioning
 * stays consistent across pages and mirrors docs/messaging-architecture.md.
 * Language: clear, B2B, DACH/Swiss — no buzzwords, no inflated claims.
 */

export const BRAND = {
  name: 'Smart Approval Flow',
  short: 'Smart Approval',
  domain: 'smartapprovalflow.ch',
  tagline: 'Digitale Freigaben für Werkstätten',
};

/** One-sentence positioning formula. */
export const POSITIONING =
  'Smart Approval Flow ist der schnellste Weg für Garagen, Zusatzarbeiten digital, ' +
  'verständlich und belegbar vom Kunden freigeben zu lassen – mobil, ohne App, ohne Login.';

export const HERO = {
  headline: 'Zusatzarbeiten in Minuten freigeben lassen – nicht im Telefon-Ping-Pong.',
  subline:
    'Senden Sie Diagnosen und empfohlene Reparaturen als klaren, sicheren Link. Ihre Kundschaft ' +
    'gibt mobil frei, lehnt ab oder wünscht einen Rückruf – jede Entscheidung dokumentiert.',
  primaryCta: { label: 'Demo anfragen', href: '/demo' },
  secondaryCta: { label: 'So funktioniert es', href: '/product' },
};

export interface Benefit {
  title: string;
  body: string;
}

export const BENEFITS: Benefit[] = [
  {
    title: 'Mehr freigegebene Arbeiten',
    body: 'Ein klarer Link mit Foto, Klartext und Preisband erhöht die Freigabequote – schon wenige zusätzliche Freigaben pro Monat zahlen das Abo.',
  },
  {
    title: 'Weniger Nachtelefonieren',
    body: 'Die Kundschaft entscheidet, wann es ihr passt. Fahrzeuge stehen kürzer, Ihr Team gewinnt Zeit.',
  },
  {
    title: 'Belegbar statt strittig',
    body: 'Jede Freigabe ist revisionssicher protokolliert – Schluss mit Diskussionen bei der Rechnung.',
  },
  {
    title: 'Ohne App, ohne Login',
    body: 'Ein sicherer Link per E-Mail. Kein Download, kein Konto – genau das, was Endkundschaft akzeptiert.',
  },
  {
    title: 'Läuft neben Ihrer Software',
    body: 'Kein Systemwechsel. Smart Approval Flow legt einen wertvollen Layer über Ihren bestehenden Ablauf.',
  },
];

export interface Step {
  n: number;
  title: string;
  body: string;
}

export const STEPS: Step[] = [
  {
    n: 1,
    title: 'Fall anlegen',
    body: 'Serviceberater erfasst Fahrzeug, Kunde, Befund, empfohlene Arbeit, Preisband und Dringlichkeit – mit Fotos.',
  },
  {
    n: 2,
    title: 'Sicheren Link senden',
    body: 'Ein Klick versendet die Anfrage per E-Mail. Der Link ist unguessbar und zeitlich begrenzt.',
  },
  {
    n: 3,
    title: 'Kunde entscheidet mobil',
    body: 'Freigeben, ablehnen oder Rückruf wünschen – verständlich erklärt, ohne Login.',
  },
  {
    n: 4,
    title: 'Status live sehen',
    body: 'Ihr Team sieht jede Reaktion in Echtzeit, inklusive vollständigem Verlauf.',
  },
];

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: 'Braucht meine Kundschaft eine App oder ein Konto?',
    a: 'Nein. Sie öffnet einen sicheren Link per E-Mail und entscheidet direkt – ohne Download, ohne Login.',
  },
  {
    q: 'Ersetzt das meine bestehende Werkstattsoftware?',
    a: 'Nein. Smart Approval Flow ist bewusst ein Layer obendrauf. Sie behalten Ihre Abläufe und ergänzen digitale Freigaben.',
  },
  {
    q: 'Ist das rechtlich belegbar?',
    a: 'Jede Aktion wird mit Zeitstempel revisionssicher protokolliert. Sie haben jederzeit einen nachvollziehbaren Verlauf jeder Freigabe.',
  },
  {
    q: 'Wie schnell sind wir startklar?',
    a: 'In der Regel innerhalb eines Tages. Sie hinterlegen Ihr Branding, passen die Texte an und senden die erste Freigabe.',
  },
  {
    q: 'Was kostet es?',
    a: 'Transparente Monatspläne pro Workspace. Die Preise auf der Pricing-Seite sind eine vorläufige Draft-Struktur für die Pilotphase.',
  },
  {
    q: 'Wie steht es um den Datenschutz?',
    a: 'Datenminimierung by design: Die Kundenseite zeigt nur freigaberelevante Informationen. Details auf der Seite „Sicherheit“.',
  },
];

/** Short blurb for LinkedIn / e-mail / demo contexts. */
export const SHORT_PITCH =
  'Smart Approval Flow hilft Garagen, Zusatzarbeiten digital und belegbar freigeben zu lassen: ' +
  'Der Serviceberater sendet Befund, Foto und Preisband als sicheren Link, die Kundschaft gibt ' +
  'mobil frei – ohne App, ohne Login. Schneller, professioneller, nachvollziehbar.';

export interface PricingTier {
  id: string;
  name: string;
  audience: string;
  priceDraft: string;
  period: string;
  features: string[];
  limits: string;
  cta: { label: string; href: string };
  highlighted?: boolean;
}

/** DRAFT pricing — clearly marked as provisional for the pilot phase. */
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    audience: 'Einzelgarage, die digitale Freigaben testen will',
    priceDraft: 'CHF 49',
    period: 'pro Monat / Workspace',
    features: [
      '1 Workspace, bis 2 Nutzer',
      'Freigaben per E-Mail-Link',
      'Fotos, Preisband, Dringlichkeit',
      'Revisionssicherer Audit-Trail',
      'Standard-Nachrichtenvorlagen',
    ],
    limits: 'Begrenzte Freigaben pro Monat · E-Mail-Kanal',
    cta: { label: 'Early Access anfragen', href: '/demo' },
  },
  {
    id: 'pro',
    name: 'Pro',
    audience: 'Etablierte Garage mit regelmässigem Freigabevolumen',
    priceDraft: 'CHF 149',
    period: 'pro Monat / Workspace',
    features: [
      'Bis 10 Nutzer, Rollen & Rechte',
      'Höheres/unbegrenztes Freigabevolumen',
      'Eigene Nachrichtenvorlagen',
      'White-Label-Branding der Kundenseite',
      'Auswertung & Reporting',
      'SMS-Kanal (vorbereitet)',
    ],
    limits: 'Fairer Nutzungsrahmen · SMS als Add-on',
    cta: { label: 'Demo anfragen', href: '/demo' },
    highlighted: true,
  },
  {
    id: 'group',
    name: 'Multi / Group',
    audience: 'Werkstattgruppen und Partner mit mehreren Standorten',
    priceDraft: 'Individuell',
    period: 'nach Standorten',
    features: [
      'Mehrere Workspaces',
      'Zentrale Rollen- & Team-Verwaltung',
      'API-Zugang (Integration)',
      'White-Label / Partneroptionen',
      'Priorisierter Support & Onboarding',
    ],
    limits: 'Setup-Fee je nach Umfang',
    cta: { label: 'Gespräch vereinbaren', href: '/demo' },
  },
];

/** Primary nav for the marketing header. */
export const MARKETING_NAV = [
  { label: 'Produkt', href: '/product' },
  { label: 'Für Garagen', href: '/for-garages' },
  { label: 'Preise', href: '/pricing' },
  { label: 'Sicherheit', href: '/security' },
  { label: 'FAQ', href: '/faq' },
];
