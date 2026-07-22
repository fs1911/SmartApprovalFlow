import Link from 'next/link';

/** Reusable marketing building blocks. Presentational only. */

export function Section({
  children,
  muted = false,
  id,
}: {
  children: React.ReactNode;
  muted?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`mk-section ${muted ? 'mk-section--muted' : ''}`}>
      <div className="mk-container">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mk-eyebrow">{children}</p>;
}

export function CtaRow({
  primary,
  secondary,
}: {
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <div className="mk-cta-row">
      <Link href={primary.href} className="btn btn--primary btn--lg" style={{ width: 'auto' }}>
        {primary.label}
      </Link>
      {secondary && (
        <Link href={secondary.href} className="btn btn--secondary btn--lg" style={{ width: 'auto' }}>
          {secondary.label}
        </Link>
      )}
    </div>
  );
}

export function FinalCta() {
  return (
    <Section muted>
      <div className="mk-final-cta">
        <h2>Bereit, Freigaben professioneller zu machen?</h2>
        <p className="subtle">
          In einem kurzen Gespräch zeigen wir Ihnen den Ablauf an einem echten Beispiel aus dem
          Werkstattalltag.
        </p>
        <CtaRow
          primary={{ label: 'Demo anfragen', href: '/demo' }}
          secondary={{ label: 'Preise ansehen', href: '/pricing' }}
        />
      </div>
    </Section>
  );
}
