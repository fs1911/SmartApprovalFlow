import type { Metadata } from 'next';
import { FAQS, BRAND } from '../_content';
import { Section, Eyebrow, FinalCta } from '../_components';

export const metadata: Metadata = {
  title: `FAQ — ${BRAND.name}`,
  description:
    'Häufige Fragen zu Smart Approval Flow: App/Login, Integration mit bestehender Software, ' +
    'Belegbarkeit, Startzeit, Preise und Datenschutz.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return (
    <>
      <Section>
        <Eyebrow>FAQ</Eyebrow>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-5)' }}>
          Häufige Fragen
        </h1>
        <div className="mk-faq">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
      <FinalCta />
    </>
  );
}
