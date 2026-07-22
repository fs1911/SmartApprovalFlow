import type { Metadata } from 'next';
import Link from 'next/link';
import { PRICING_TIERS, BRAND } from '../_content';
import { Section, Eyebrow, FinalCta } from '../_components';

export const metadata: Metadata = {
  title: `Preise — ${BRAND.name}`,
  description:
    'Transparente Monatspläne pro Workspace: Starter, Pro und Multi/Group. Vorläufige ' +
    'Draft-Preise für die Pilotphase. Setup-Fee und Add-ons je nach Umfang.',
  alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
  return (
    <>
      <section className="mk-hero">
        <div className="mk-container">
          <Eyebrow>Preise</Eyebrow>
          <h1>Ein Plan, der sich schon ab wenigen Freigaben rechnet.</h1>
          <p className="mk-hero__sub">
            Preis pro Workspace, monatlich kündbar. Schon wenige zusätzliche freigegebene Arbeiten
            pro Monat übersteigen die Abokosten.
          </p>
          <span className="mk-draft-note">
            Vorläufige Draft-Preise · Pilotphase · zzgl. MwSt · Änderungen vorbehalten
          </span>
        </div>
      </section>

      <Section>
        <div className="mk-pricing">
          {PRICING_TIERS.map((t) => (
            <div key={t.id} className={`mk-price-card ${t.highlighted ? 'mk-price-card--hl' : ''}`}>
              {t.highlighted && <span className="badge badge--info">Empfohlen</span>}
              <div>
                <h3 style={{ margin: 0 }}>{t.name}</h3>
                <p className="subtle" style={{ margin: '4px 0 0', minHeight: 40 }}>
                  {t.audience}
                </p>
              </div>
              <div>
                <div className="mk-price-card__price">{t.priceDraft}</div>
                <div className="subtle" style={{ fontSize: 'var(--text-xs)' }}>{t.period}</div>
              </div>
              <ul>
                {t.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="subtle" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                {t.limits}
              </p>
              <Link
                href={t.cta.href}
                className={`btn ${t.highlighted ? 'btn--primary' : 'btn--secondary'} btn--block`}
              >
                {t.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section muted>
        <Eyebrow>Fair &amp; transparent</Eyebrow>
        <h2>Was Sie erwarten dürfen.</h2>
        <div className="mk-grid" style={{ marginTop: 'var(--space-6)' }}>
          <div className="mk-feature">
            <h3>Monatlich oder jährlich</h3>
            <p>Monatlich kündbar; Jahresabrechnung mit Rabatt. Upgrade jederzeit möglich.</p>
          </div>
          <div className="mk-feature">
            <h3>Setup &amp; Onboarding</h3>
            <p>
              Für Pro/Group eine optionale einmalige Einrichtungsgebühr (Branding, Vorlagen,
              Kurzschulung) – <span className="mk-draft-note">TODO PROVIDER DECISION</span>
            </p>
          </div>
          <div className="mk-feature">
            <h3>Add-ons später</h3>
            <p>SMS-Kontingente, API/Integrationen und White-Label als spätere Zusatzoptionen.</p>
          </div>
        </div>
        <p className="subtle" style={{ marginTop: 'var(--space-5)' }}>
          Die Preisbildung ist in <code>docs/pricing-rationale.md</code> begründet; Abrechnung und
          Zahlungsanbieter sind in <code>docs/billing-strategy.md</code> vorbereitet (noch keine
          Live-Zahlungen).
        </p>
      </Section>

      <FinalCta />
    </>
  );
}
