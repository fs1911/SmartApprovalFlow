import Link from 'next/link';

export interface OnboardingStep {
  key: string;
  title: string;
  done: boolean;
  href: string;
}
export interface OnboardingData {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  complete: boolean;
  nextStep: OnboardingStep | null;
  activated: boolean;
}

/**
 * Guided onboarding checklist. Renders only while onboarding is incomplete, so
 * it disappears on its own once the workspace is set up. Server component — the
 * data is fetched in the page.
 */
export function OnboardingWidget({ data }: { data: OnboardingData }) {
  if (data.complete) return null;
  const pct = Math.round((data.completedCount / data.totalCount) * 100);

  return (
    <div className="card" style={{ marginBottom: 24, borderColor: 'var(--color-brand-500)' }}>
      <div className="card__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Erste Schritte</h2>
          <span className="subtle">
            {data.completedCount}/{data.totalCount} erledigt
          </span>
        </div>
        <p className="subtle" style={{ margin: '4px 0 12px' }}>
          Bringen Sie Ihre Werkstatt in wenigen Minuten produktiv an den Start.
        </p>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding-Fortschritt"
          style={{ height: 8, borderRadius: 999, background: 'var(--color-surface-subtle)', overflow: 'hidden', marginBottom: 14 }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-brand-500)' }} />
        </div>

        <ol className="stack" style={{ gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
          {data.steps.map((s) => (
            <li key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                aria-hidden
                style={{
                  width: 22,
                  height: 22,
                  flex: '0 0 22px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 'var(--text-xs)',
                  background: s.done ? 'var(--color-success-500)' : 'var(--color-surface-subtle)',
                  color: s.done ? '#fff' : 'var(--color-text-subtle)',
                  border: s.done ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {s.done ? '✓' : ''}
              </span>
              {s.done ? (
                <span className="subtle" style={{ textDecoration: 'line-through' }}>
                  {s.title}
                </span>
              ) : (
                <Link href={s.href}>{s.title}</Link>
              )}
            </li>
          ))}
        </ol>

        {data.nextStep && (
          <div style={{ marginTop: 14 }}>
            <Link href={data.nextStep.href} className="btn btn--primary">
              Weiter: {data.nextStep.title}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
